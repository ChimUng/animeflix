import React, { useState } from 'react';
import { Select, SelectItem, Input, Textarea, Button } from "@nextui-org/react";
import { updatelist } from '@/lib/anilistqueries';
import { toast } from 'sonner';
import { MediaListEntry } from '@/types/anilist';
import type { Session } from 'next-auth';
import { syncFavouriteStatusAction } from '@/lib/Fanfavouriteactions';

interface Props {
    list: MediaListEntry | null;
    eplength: number;
    Handlelist: () => void;
    session: Session | null;
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
            if (year != null && month != null && day != null) {
                return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            }
        }
        return '';
    });
    const [finishDate, setFinishDate] = useState<string>(() => {
        if (list?.completedAt) {
            const { year, month, day } = list.completedAt;
            if (year != null && month != null && day != null) {
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

    // Clamp thay vì chặn cứng: luôn cập nhật, kẹp giá trị trong [min, max], vẫn toast khi vượt/dưới ngưỡng
    const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        if (raw === '') { setProgress(0); return; }
        let newProgress = Number(raw);
        if (Number.isNaN(newProgress)) return;
        if (newProgress > eplength) {
            toast.error(`Tiến độ không thể vượt quá ${eplength}`);
            newProgress = eplength;
        }
        if (newProgress < 0) {
            toast.error("Tiến độ không thể âm");
            newProgress = 0;
        }
        setProgress(newProgress);
    };

    const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        if (raw === '') { setScore(0); return; }
        let newScore = Number(raw);
        if (Number.isNaN(newScore)) return;
        if (newScore > 10) {
            toast.error("Đánh giá không thể vượt quá 10");
            newScore = 10;
        }
        if (newScore < 0) {
            toast.error("Đánh giá không thể âm");
            newScore = 0;
        }
        setScore(newScore);
    };

    const handleRewatchesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        if (raw === '') { setRewatches(0); return; }
        let newVal = Number(raw);
        if (Number.isNaN(newVal)) return;
        if (newVal < 0) newVal = 0;
        setRewatches(newVal);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const token = session?.user?.token;
        if (!token) {
            toast.error("Vui lòng đăng nhập lại");
            return;
        }
        try {
            const startedAtDateInfo = startDate ? extractDateInfo(startDate) : null;
            const finishAtDateInfo = finishDate ? extractDateInfo(finishDate) : null;

            const response = await fetch("https://graphql.anilist.co/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    query: updatelist,
                    variables: {
                        id: list?.id || undefined,
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
            if (!data?.SaveMediaListEntry) {
                toast.error("Something went wrong");
                return;
            }
            setList(data.SaveMediaListEntry);
            toast.success("List entry updated");
            // Tự động đánh dấu Favourite trên AniList khi thêm vào danh sách,
            // CHỈ gọi nếu chưa favourite (ToggleFavourite là toggle, gọi 2 lần sẽ tắt lại)
            const alreadyFavourite = data.SaveMediaListEntry?.media?.isFavourite;
            if (!alreadyFavourite) {
                try {
                    await fetch("https://graphql.anilist.co/", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            query: `mutation ($id: Int) { ToggleFavourite(animeId: $id) { anime { nodes { id isFavourite } } } }`,
                            variables: { id },
                        }),
                    });

                    // Cập nhật luôn cache trong Mongo (không đợi tới lần comment thứ 15+ / 24h)
                    // filmId phải khớp đúng định dạng đang dùng ở CommentSection (`anime-info-${id}`)
                    await syncFavouriteStatusAction(`anime-info-${id}`, true);
                } catch (favError) {
                    // Không toast lỗi ở đây — favourite là hành động phụ, không nên chặn luồng lưu list chính
                    console.error("Không thể tự động đánh dấu favourite:", favError);
                }
            }

            Handlelist();
        } catch (error) {
            toast.error("Something went wrong");
            console.error(error);
        }
    };

    const deleteList = async () => {
        const token = session?.user?.token;
        if (!token) {
            toast.error("Vui lòng đăng nhập lại");
            return;
        }
        try {
            const response = await fetch("https://graphql.anilist.co/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    query: `
                        mutation DeleteMediaListEntry($id: Int) {
                        DeleteMediaListEntry(id: $id) {
                            deleted
                        }
                        }
                    `,
                    variables: { id: list?.id },
                }),
            });
            const { data } = await response.json();
            if (data?.DeleteMediaListEntry?.deleted === true) {
                toast.success("List entry deleted");
                setList(null);
                // Gỡ khỏi watchlist -> gỡ luôn Favourite trên AniList (giả định: favourite này
                // là do app tự động bật lúc thêm vào list, nên khi bỏ list thì bỏ theo).
                // Lưu ý: nếu user đã tự tay favourite phim này TRƯỚC KHI dùng app (ngoài luồng
                // Addtolist), thao tác này sẽ vô tình bỏ favourite đó — đây là đánh đổi chấp nhận được
                // vì không có cách nào phân biệt "favourite do app set" với "favourite user tự set" từ AniList.
                try {
                    await fetch("https://graphql.anilist.co/", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            query: `mutation ($id: Int) { ToggleFavourite(animeId: $id) { anime { nodes { id isFavourite } } } }`,
                            variables: { id },
                        }),
                    });
                    await syncFavouriteStatusAction(`anime-info-${id}`, false);
                } catch (favError) {
                    console.error("Không thể tự động bỏ favourite:", favError);
                }
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
                listboxProps={{
                    itemClasses: {
                        base: [
                            // Đổi màu nền & chữ khi hover hoặc dùng bàn phím focus vào
                            "data-[hover=true]:bg-d148h",
                            "data-[hover=true]:text-white",
                            "data-[selectable=true]:focus:bg-d148h",
                            "data-[selectable=true]:focus:text-white",
                            // Đổi màu nền & chữ cho item đang được chọn (đang active)
                            "data-[selected=true]:bg-d148h",
                            "data-[selected=true]:text-white",
                        ],
                    },
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
                min={0}
                max={10}
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
                min={0}
                max={eplength}
                classNames={{
                mainWrapper: "p-0 m-0 !h-[34px]",
                inputWrapper: "m-0 !min-h-[34px] w-full",
                }}
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
                min={0}
                value={rewatches.toString()}
                onChange={handleRewatchesChange}
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