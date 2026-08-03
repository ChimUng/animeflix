'use server'

import { getAuthSession } from "@/app/api/auth/[...nextauth]/route";
import { connectMongo } from "@/mongodb/db";
import { revalidatePath } from "next/cache";
import { Session } from "next-auth";
import Watch, { IWatch } from '@/mongodb/models/watch';
import { DeleteParams, DeleteResult, UpdateEpParams, WatchData } from '@/types/watch';

export const getWatchHistory = async (): Promise<WatchData[] | void> => {
  try {
    await connectMongo();
    const session: Session | null = await getAuthSession();
    if (!session?.user?.name) {
      return [];
    }
    const history: IWatch[] = await Watch.find({ userName: session.user.name });
    return JSON.parse(JSON.stringify(history || []));
  } catch (error) {
    console.error("Error fetching watch history", error);
  }
  revalidatePath("/");
};

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
      return null;
    }

    await Watch.create({
      userName: session.user.name,
      aniId: aniId,
      epNum: epNum,
    });
  } catch (error) {
    console.error("Error creating episode tracking:", error);
  }
};

export const getEpisode = async (aniId: string, epNum: number): Promise<WatchData[] | void> => {
  try {
    await connectMongo();
    const session: Session | null = await getAuthSession();
    if (!session?.user?.name) {
      return;
    }

    if (aniId && epNum) {
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
    console.error('Error updating episode:', error);
  }
}

export const deleteEpisodes = async (data: DeleteParams): Promise<DeleteResult | void> => {
  try {
    await connectMongo();
    const session: Session | null = await getAuthSession();

    if (!session?.user?.name) {
      return { message: "User not authenticated", deletedCount: 0 };
    }

    let deletedCount = 0;

    if (data.epId) {
      const deleted = await Watch.findOneAndDelete({
        userName: session.user.name,
        epId: data.epId,
      });
      deletedCount = deleted ? 1 : 0;
    } else if (data.aniId) {
      const result = await Watch.deleteMany({
        userName: session.user.name,
        aniId: data.aniId,
      });
      deletedCount = result.deletedCount ?? 0;
    } else {
      return { message: "Invalid request, provide epId or aniId", deletedCount: 0 };
    }

    if (deletedCount === 0) {
      return { message: "Data not found for deletion", deletedCount: 0 };
    }

    const remainingData: WatchData[] = JSON.parse(JSON.stringify(await Watch.find({ userName: session.user.name })));

    return { message: "Removed from history", remainingData, deletedCount };
  } catch (error) {
    console.error(error);
    return { message: "An error occurred during deletion.", deletedCount: 0 };
  }
}