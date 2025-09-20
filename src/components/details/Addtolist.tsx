import React, { useState } from 'react';
import { Select, SelectItem, Input, Textarea, Button } from "@nextui-org/react";
import { updatelist } from '@/lib/anilistqueries';
import { toast } from 'sonner';
import { MediaListEntry } from '@/lib/AnilistUser';

interface Props {
    list: MediaListEntry | null;
    eplength: number;
    Handlelist: () => void;
    session: {
        user: {
        token: string;
        };
    };
    id: number;
    setList: (entry: MediaListEntry | null) => void;
}

const statusOptions = [
    { name: "Đang xem", value: "CURRENT" },
    { name: "Dự định xem", value: "PLANNING" },
    { name: "Đã hoàn thành", value: "COMPLETED" },
    { name: "Đang xem lại", value: "REPEATING" },
    { name: "Tạm dừng", value: "PAUSED" },
    { name: "Đã bỏ", value: "DROPPED" },
    ];

    function Addtolist({ list, eplength, Handlelist, session, id, setList }: Props) {
    const [status, setStatus] = useState<string>(list?.status || '');
    const [score, setScore] = useState<number>(list?.score || 0);
    const [progress, setProgress] = useState<number>(list?.progress || 0);
    const [startDate, setStartDate] = useState<string>(() => {
        if (list?.startedAt) {
        const { year, month, day } = list.startedAt;
        if (year !== null && month !== null && day !== null) {
            return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }
        }
        return '';
    });
    const [finishDate, setFinishDate] = useState<string>(() => {
        if (list?.completedAt) {
        const { year, month, day } = list.completedAt;
        if (year !== null && month !== null && day !== null) {
            return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }
        }
        return '';
    });
    const [rewatches, setRewatches] = useState<number>(list?.repeat || 0);
    const [notes, setNotes] = useState<string>(list?.notes || '');

    const extractDateInfo = (dateString: string) => {
        const dateObj = new Date(dateString);
        return {
        year: dateObj.getFullYear(),
        month: dateObj.getMonth() + 1,
        day: dateObj.getDate(),
        };
    };

    const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newProgress = Number(e.target.value);
        if (newProgress > eplength) {
        toast.error(`Progress cannot exceed the maximum value ${eplength}`);
        } else {
        setProgress(newProgress);
        }
    };

    const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newScore = Number(e.target.value);
        if (newScore > 10) {
        toast.error("Score cannot exceed 10");
        } else {
        setScore(newScore);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
        const startedAtDateInfo = startDate ? extractDateInfo(startDate) : null;
        const finishAtDateInfo = finishDate ? extractDateInfo(finishDate) : null;

        const response = await fetch("https://graphql.anilist.co/", {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            Accept: 'application/json',
            Authorization: `Bearer ${session.user.token}`,
            },
            body: JSON.stringify({
            query: updatelist,
            variables: {
                mediaId: id,
                progress: progress || 0,
                status: status || null,
                score: score || 0,
                startedAt: startedAtDateInfo || null,
                completedAt: finishAtDateInfo || null,
                repeat: rewatches || 0,
                notes: notes || null,
            },
            }),
        });
        const { data } = await response.json();
        if (data.SaveMediaListEntry === null) {
            toast.error("Something went wrong");
            return;
        }
        setList(data.SaveMediaListEntry);
        toast.success("List entry updated");
        Handlelist();
        } catch (error) {
        toast.error("Something went wrong");
        console.error(error);
        }
    };

    const deleteList = async () => {
        try {
        const response = await fetch("https://graphql.anilist.co/", {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${session.user.token}`,
            },
            body: JSON.stringify({
            query: `
                mutation DeleteMediaListEntry($id: Int) {
                DeleteMediaListEntry(id: $id) {
                    deleted
                }
                }
            `,
            variables: {
                id: list?.id,
            },
            }),
        });
        const { data } = await response.json();
        if (data.DeleteMediaListEntry?.deleted === true) {
            toast.success("List entry deleted");
            setList(null);
            Handlelist();
            return;
        }
        toast.error("Something went wrong");
        } catch (error) {
        toast.error("Something went wrong");
        console.error(error);
        }
    };

    return (
        <div className='md:px-1'>
        <form onSubmit={handleSubmit}>
            <div className='grid sm:grid-cols-3 gap-8 gap-y-7 mb-6'>
            <Select
                labelPlacement="outside"
                label="Trạng thái"
                placeholder="Trạng thái"
                selectedKeys={[status]}
                onChange={(e) => setStatus(e.target.value)}
                classNames={{
                mainWrapper: "p-0 m-0 !h-[34px]",
                trigger: "m-0 !min-h-[34px] w-full pr-0",
                listbox: "m-0 p-0",
                }}
                radius="sm"
                disallowEmptySelection={true}
            >
                {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                    {option.name}
                </SelectItem>
                ))}
            </Select>
            <Input
                type="number"
                label="Đánh giá"
                labelPlacement="outside"
                placeholder="Đánh giá"
                radius="sm"
                classNames={{
                mainWrapper: "p-0 m-0 !h-[34px]",
                inputWrapper: "m-0 !min-h-[34px] w-full",
                }}
                value={score.toString()}
                onChange={handleScoreChange}
            />
            <Input
                type="number"
                label="Tiến độ"
                labelPlacement="outside"
                placeholder="Tiến độ"
                radius="sm"
                classNames={{
                mainWrapper: "p-0 m-0 !h-[34px]",
                inputWrapper: "m-0 !min-h-[34px] w-full",
                }}
                max={eplength}
                value={progress.toString()}
                onChange={handleProgressChange}
            />
            <Input
                type="date"
                label="Ngày bắt đầu"
                labelPlacement="outside"
                radius="sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
                type="date"
                label="Ngày kết thúc"
                labelPlacement="outside"
                radius="sm"
                value={finishDate}
                onChange={(e) => setFinishDate(e.target.value)}
            />
            <Input
                type="number"
                label="Tổng số lần xem lại"
                labelPlacement="outside"
                radius="sm"
                value={rewatches.toString()}
                onChange={(e) => setRewatches(Number(e.target.value))}
            />
            </div>
            <Textarea
            variant="flat"
            label="Ghi chú"
            placeholder="Nhập ghi chú..."
            labelPlacement="outside"
            className="max-w-full"
            minRows={1}
            disableAnimation={true}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            />
            <div className='mt-6 mb-4 flex flex-row gap-4 items-end justify-end w-full'>
            <Button color="danger" radius='md' size="sm" onClick={deleteList} className={`${list && list?.status !== null ? 'flex' : 'hidden'}`}>
                Xóa
            </Button>
            <Button className='bg-[#4d148c]' type='submit' radius="md" size="sm" isDisabled={!status}>
                Lưu
            </Button>
            </div>
        </form>
        </div>
    );
}

export default Addtolist;
