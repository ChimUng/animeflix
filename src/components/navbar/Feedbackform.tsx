'use client';
import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem, Textarea } from "@nextui-org/react";
import { toast } from 'sonner';

interface FeedbackFormProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export default function Feedbackform({ isOpen, onOpenChange }: FeedbackFormProps) {
    const [title, setTitle] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [feedbackType, setFeedbackType] = useState<string>('');
    const [severityLevel, setSeverityLevel] = useState<string>('');

    const options = [
        { label: 'Gợi ý', value: 'Suggestion' },
        { label: 'Báo lỗi', value: 'Bug Report' },
        { label: 'Yêu cầu tính năng', value: 'Feature Request' },
        { label: 'Khác', value: 'Other' },
    ];

    const severityOptions = [
        { label: 'Thấp', value: 'Low' },
        { label: 'Trung bình', value: 'Medium' },
        { label: 'Cao', value: 'High' },
        { label: 'Nguy cấp', value: 'Critical' },
    ];

    const handleSubmit = async () => {
        if (!title || !description) {
        toast.error('Tiêu đề và mô tả bắt buộc!');
        return;
        }

        try {
        const response = await fetch(`/api/admin/feedback-report`, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({
            title,
            description,
            type: feedbackType,
            severity: severityLevel,
            }),
        });

        if (response.status === 201) {
            toast.success('Báo cáo phản hồi đã được gửi thành công');
            setTitle('');
            setDescription('');
            setFeedbackType('');
            setSeverityLevel('');
        } else {
            toast.error('Không thể gửi báo cáo phản hồi. Vui lòng thử lại sau.');
        }
        } catch (error) {
        console.error('Error submitting feedback report:', error);
        toast.error('Đã xảy ra lỗi khi gửi báo cáo phản hồi. Vui lòng thử lại sau.');
        }
    };

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center" backdrop="blur">
        <ModalContent>
            {(onClose) => (
            <>
                <ModalHeader className="flex flex-col gap-1">Phản hồi</ModalHeader>
                <ModalBody>
                <Input
                    type="text"
                    label="Tiêu đề"
                    placeholder="Nhập tiêu đề"
                    isRequired
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <Textarea
                    variant="flat"
                    label="Mô tả"
                    placeholder="Nhập mô tả của bạn"
                    className="md:col-span-6 mb-0"
                    isRequired
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
                <div className="flex flex-row flex-wrap gap-2 justify-between">
                    <Select
                    label="Loại phản hồi"
                    placeholder="Chọn loại"
                    className="flex-grow sm:max-w-[185px]"
                    selectedKeys={feedbackType ? [feedbackType] : []}
                    onChange={(e) => setFeedbackType(e.target.value)}
                    >
                    {options.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                        {item.label}
                        </SelectItem>
                    ))}
                    </Select>
                    <Select
                    label="Mức độ nghiêm trọng"
                    placeholder="Chọn mức độ"
                    className="flex-grow sm:max-w-[185px] mt-1 sm:mt-0"
                    selectedKeys={severityLevel ? [severityLevel] : []}
                    onChange={(e) => setSeverityLevel(e.target.value)}
                    >
                    {severityOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                        {item.label}
                        </SelectItem>
                    ))}
                    </Select>
                </div>
                </ModalBody>
                <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>
                    Hủy
                </Button>
                <Button
                    className={`bg-[#4D148c] ${!title || !description ? 'pointer-events-none' : ''}`}
                    onClick={handleSubmit}
                    onPress={onClose}
                >
                    Gửi
                </Button>
                </ModalFooter>
            </>
            )}
        </ModalContent>
        </Modal>
    );
}
