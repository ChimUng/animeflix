// Mark this file as a Server Action file
'use server'

import { getAuthSession } from "@/app/api/auth/[...nextauth]/route";
import { connectMongo } from "@/mongodb/db";
import { revalidatePath } from "next/cache";
import { Session } from "next-auth";
// Import IWatch từ file model của bạn, đây là nguồn tin cậy duy nhất cho kiểu dữ liệu
import Watch, { IWatch } from '@/mongodb/models/watch';
import { DeleteResult as MongooseDeleteResult } from "mongodb";

// --- Type Definitions ---

// Sử dụng các thuộc tính từ IWatch để đảm bảo tính nhất quán
// Omit dùng để loại bỏ các trường không cần thiết từ IWatch
type UpdateEpParams = Omit<Partial<IWatch>, '_id' | 'createdAt' | 'userName'> & {
  userName?: string;
  aniId: string;
  epNum: number;
};

// Define the structure for the parameters of the deleteEpisodes function
interface DeleteParams {
  epId?: string;
  aniId?: string;
}

// Define a clearer return type for the delete function
type DeleteResult = {
  message: string;
  remainingData?: IWatch[];
  deletedData?: IWatch | MongooseDeleteResult | null;
}

// --- Server Actions ---

export const getWatchHistory = async (): Promise<IWatch[] | void> => {
  try {
    await connectMongo();
    const session: Session | null = await getAuthSession();
    if (!session?.user?.name) {
      return []; // Trả về mảng rỗng nếu chưa đăng nhập
    }
    // Sử dụng IWatch cho kiểu dữ liệu của history
    const history: IWatch[] = await Watch.find({ userName: session.user.name });

    if (!history) {
      return [];
    }
    return JSON.parse(JSON.stringify(history));
  } catch (error) {
    console.error("Error fetching watch history", error);
  }
  revalidatePath("/");
};

// Sửa kiểu của epNum thành number để khớp với schema
export const createWatchEp = async (aniId: string, epNum: number): Promise<void | null> => {
  try {
    await connectMongo();
    const session: Session | null = await getAuthSession();

    if (!session?.user?.name) {
      return;
    }

    const existingWatch = await Watch.findOne({
      userName: session.user.name,
      aniId: aniId,
      epNum: epNum,
    });

    if (existingWatch) {
      return null; // Trả về null để báo hiệu đã tồn tại
    }

    await Watch.create({
      userName: session.user.name,
      aniId: aniId,
      epNum: epNum,
    });

  } catch (error) {
    console.error("Oops! Something went wrong while creating the episode tracking:", error);
  }
};

// Sửa kiểu của epNum thành number
export const getEpisode = async (aniId: string, epNum: number): Promise<IWatch[] | void> => {
  try {
    await connectMongo();
    const session: Session | null = await getAuthSession();
    if (!session?.user?.name) {
      return;
    }

    if (aniId && epNum) {
      // Sử dụng IWatch cho kiểu dữ liệu của episode
      const episode: IWatch[] = await Watch.find({
        userName: session.user.name,
        aniId: aniId,
        epNum: epNum,
      });
      if (episode && episode.length > 0) {
        return JSON.parse(JSON.stringify(episode));
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

export const updateEp = async (params: UpdateEpParams): Promise<void> => {
  try {
    await connectMongo();
    const session: Session | null = await getAuthSession();

    if (!session?.user?.name) {
      return;
    }
    
    const { aniId, epNum, ...updateData } = params;

    await Watch.findOneAndUpdate(
      {
        userName: session.user.name,
        aniId: aniId,
        epNum: epNum,
      },
      {
        $set: {
          ...updateData,
          subtype: updateData.subtype || "sub",
        },
      },
      { new: true, upsert: false }
    );
  } catch (error) {
    console.log('Error updating episode:', error);
  }
}

export const deleteEpisodes = async (data: DeleteParams): Promise<DeleteResult | void> => {
  try {
    await connectMongo();
    const session: Session | null = await getAuthSession();

    if (!session?.user?.name) {
      return { message: "User not authenticated" };
    }

    let deletedData;

    if (data.epId) {
      deletedData = await Watch.findOneAndDelete({
        userName: session.user.name,
        epId: data.epId
      });
    } else if (data.aniId) {
      deletedData = await Watch.deleteMany({
        userName: session.user.name,
        aniId: data.aniId,
      });
    } else {
      return { message: "Invalid request, provide epId or aniId" };
    }

    if (!deletedData || (deletedData.deletedCount !== undefined && deletedData.deletedCount === 0)) {
        return { message: "Data not found for deletion" };
    }

    // Sử dụng IWatch cho kiểu dữ liệu của remainingData
    const remainingData: IWatch[] = JSON.parse(JSON.stringify(await Watch.find({ userName: session.user.name })));

    return { message: `Removed from history`, remainingData, deletedData };
  } catch (error) {
    console.log(error);
    return { message: "An error occurred during deletion." };
  }
}