import { NextResponse, NextRequest } from "next/server";
import { connectMongo } from "@/mongodb/db";
import Feedback from "@/mongodb/models/feedback";

// GET - Lấy tất cả feedback reports
export const GET = async (req: NextRequest) => {
    try {
        await connectMongo();

        const reports = await Feedback.find();
        
        if (!reports || reports.length === 0) {
            return NextResponse.json({ message: "No feedback reports found" });
        }

        return NextResponse.json(reports);
    } catch (error) {
        console.error("Error fetching feedback reports:", error);
        return NextResponse.json(
            { message: "Failed to retrieve feedback reports. Please try again later." },
            { status: 500 }
        );
    }
};

// POST - Tạo feedback report mới
export const POST = async (request: NextRequest) => {
    try {
        const { title, description, type, severity } = await request.json();

        await connectMongo();

        const newReport = await Feedback.create({
            title,
            description,
            type,
            severity,
        });

        return NextResponse.json(
            { message: "Feedback report saved successfully", data: newReport },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error saving feedback report:", error);
        return NextResponse.json(
            { message: "Failed to save feedback report. Please try again later." },
            { status: 500 }
        );
    }
};

// DELETE - Xóa feedback report theo ID hoặc xóa tất cả
export const DELETE = async (req: NextRequest) => {
    try {
        const { id } = await req.json();

        await connectMongo();

        if (id) {
            // Xóa feedback report theo ID
            const deletedReport = await Feedback.findByIdAndDelete(id);
            
            if (!deletedReport) {
                return NextResponse.json(
                    { message: `Feedback report with ID ${id} not found` },
                    { status: 404 }
                );
            }
            
            return NextResponse.json({
                message: `Feedback report with ID ${id} deleted successfully`,
            });
        } else {
            // Xóa tất cả feedback reports
            const deletedCount = await Feedback.deleteMany({});
            
            return NextResponse.json({
                message: `Deleted ${deletedCount.deletedCount} feedback reports`,
            });
        }
    } catch (error) {
        const { id } = await req.json().catch(() => ({ id: null }));
        console.error(`Error deleting feedback report${id ? ` with ID ${id}` : 's'}:`, error);
        
        return NextResponse.json(
            { message: "Failed to delete feedback report(s). Please try again later." },
            { status: 500 }
        );
    }
};