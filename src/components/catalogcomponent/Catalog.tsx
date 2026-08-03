'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Accordion, AccordionItem, Select, SelectItem, RadioGroup, Radio, Input } from "@nextui-org/react";
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption, Transition } from '@headlessui/react';
import Searchcard from './Searchcard';
import styles from '../../styles/Catalog.module.css';
import { seasonOptions, genreOptions, tagsOptions, formatOptions, yearOptions, sortbyOptions, airingOptions } from './options';
import { CatalogIcon, FilterListIcon, TrashIcon, ChevronDownIcon, CheckIcon } from '@/lib/SvgIcons';
import UseDebounce from '@/utils/UseDebounce';

type SearchParams = {
    year?: string;
    season?: string;
    format?: string;
    genre?: string[] | string;
    search?: string;
    sortby?: string;
    airing?: string;
};

type Option = {
    name: string;
    value: string;
    type: string;
};

const getSelectedKey = (keys: unknown): string | null => {
    const arr = Array.from(keys as Set<React.Key>);
    return arr.length ? String(arr[0]) : null;
};

function Catalog({ searchParams }: { searchParams: SearchParams }) {
    const { year, season, format, genre, search, sortby, airing } = searchParams;
    const router = useRouter();
    const pathname = usePathname();

    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [seasonvalue, setSeasonvalue] = useState<string | null>(null);
    const [formatvalue, setFormatvalue] = useState<string | null>(null);
    const [genrevalue, setGenrevalue] = useState<Option[]>([]);
    const [query, setQuery] = useState<string>('');
    const [sortbyvalue, setSortbyvalue] = useState<string | null>(null);
    const [searchvalue, setSearchvalue] = useState<string>('');
    const [airingvalue, setAiringvalue] = useState<string | null>(null);
    const [showTopBottom, setShowTopBottom] = useState<boolean>(true);

    const [isMobile, setIsMobile] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Cờ chống vòng lặp: khi đang đồng bộ URL -> state, bỏ qua lượt đồng bộ state -> URL kế tiếp
    const isSyncingFromProps = useRef(false);
    // Debounce riêng cho việc ghi search text ra URL (tránh đẩy URL theo từng ký tự gõ)
    const debouncedSearchForUrl = UseDebounce(searchvalue, 500);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Đồng bộ URL (searchParams) -> state
    useEffect(() => {
        isSyncingFromProps.current = true;
        setSelectedYear(year || null);
        setSeasonvalue(season || null);
        setFormatvalue(format || null);
        setGenrevalue(
            Array.isArray(genre)
                ? genre.map(
                    (g) =>
                        genreOptions.find((opt) => opt.value === g) ||
                        tagsOptions.find((opt) => opt.value === g) || {
                            name: g,
                            value: g,
                            type: 'genres',
                        }
                )
                : genre
                ? [
                    genreOptions.find((opt) => opt.value === genre) ||
                    tagsOptions.find((opt) => opt.value === genre) || {
                        name: genre,
                        value: genre,
                        type: 'genres',
                    },
                ]
                : []
        );
        setSortbyvalue(sortby || null);
        setSearchvalue(search || '');
        setAiringvalue(airing || null);
    }, [year, season, format, genre, search, sortby, airing]);

        // Đồng bộ state -> URL (Backward Synchronization)
    useEffect(() => {
        if (isSyncingFromProps.current) {
            isSyncingFromProps.current = false;
            return;
        }

        const qp = new URLSearchParams();
        if (selectedYear) qp.set('year', selectedYear);
        if (seasonvalue) qp.set('season', seasonvalue);
        if (formatvalue) qp.set('format', formatvalue);
        if (sortbyvalue) qp.set('sortby', sortbyvalue);
        if (airingvalue) qp.set('airing', airingvalue);
        if (debouncedSearchForUrl) qp.set('search', debouncedSearchForUrl);
        genrevalue
            .map((g) => g.value)
            .sort()
            .forEach((v) => qp.append('genre', v));

        const nextQuery = qp.toString();
        const currentQuery = window.location.search.replace(/^\?/, '');

        if (nextQuery !== currentQuery) {
            router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedYear, seasonvalue, formatvalue, sortbyvalue, airingvalue, genrevalue, debouncedSearchForUrl, pathname, router]);


  // Xử lý responsive
    const handleResize = () => {
        setShowTopBottom(window.innerWidth > 1024);
    };

    useEffect(() => {
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleTopBottom = () => {
        setShowTopBottom(!showTopBottom);
    };

    // Reset form
    const resetValues = () => {
        setSelectedYear(null);
        setSeasonvalue(null);
        setFormatvalue(null);
        setGenrevalue([]);
        setQuery('');
        setSortbyvalue(null);
        setSearchvalue('');
        setAiringvalue(null);
    };

    const handleYearClick = (yearId: string) => {
        setSelectedYear(yearId);
    };

    // Lọc genre và tags
    const filteredGenre =
        query === ''
            ? genreOptions
            : genreOptions.filter((item) =>
                item.name
                    .toLowerCase()
                    .replace(/\s+/g, '')
                    .includes(query.toLowerCase().replace(/\s+/g, ''))
            );

    const filteredTags =
        query === ''
            ? tagsOptions
            : tagsOptions.filter((item) =>
                item.name
                    .toLowerCase()
                    .replace(/\s+/g, '')
                    .includes(query.toLowerCase().replace(/\s+/g, ''))
            );

    const isFormEmpty =
        !selectedYear &&
        !seasonvalue &&
        !formatvalue &&
        genrevalue.length === 0 &&
        !query &&
        !sortbyvalue &&
        !searchvalue &&
        !airingvalue;

    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        if (isMobile) {
            e.target.blur();
        }
    };

    return (
        <div className={styles.catalog}>
            <div className={styles.catalogtop}>
                <div className={styles.searchmobil}>
                    <div className={styles.search}>
                        <h3 className={styles.searchlabel}>Tìm kiếm</h3>
                        <Input
                            type="text"
                            aria-label="Search"
                            placeholder="Tìm kiếm Anime"
                            value={searchvalue}
                            onValueChange={setSearchvalue}
                            isClearable //tạo ra một nút dấu X nhỏ ở cuối ô input để click xóa nhanh chữ
                            autoComplete="off" //chặn trình duyệt tự động gợi ý các nội dung đã nhập trước đó.
                            startContent={
                                <CatalogIcon className="w-5 h-5 text-2xl text-default-400 pointer-events-none flex-shrink-0" />
                            }
                        />
                    </div>
                    <button
                        className="flex lg:hidden items-end cursor-default"
                        onClick={toggleTopBottom}
                        aria-label="Toggle filters"
                    >
                        <FilterListIcon className="w-6 h-6 mb-2 cursor-pointer" />
                    </button>
                    <button
                        className="flex lg:hidden items-end cursor-default"
                        onClick={resetValues}
                        disabled={isFormEmpty}
                        aria-label="Reset filters"
                    >
                        <TrashIcon className="w-6 h-6 mb-2 cursor-pointer" />
                    </button>
                </div>
                {showTopBottom && (
                    <>
                        <div className={styles.toptwo}>
                            <div className={styles.genres}>
                                <h3 className={styles.searchlabel}>Thể loại</h3>
                                <Combobox value={genrevalue} onChange={setGenrevalue} multiple>
                                    <div className="relative w-full cursor-default overflow-hidden rounded-[0.6rem] text-left shadow-md focus:outline-none sm:text-sm">
                                        <ComboboxInput
                                            ref={inputRef}
                                            className="w-full border-none py-[9px] pl-3 pr-10 text-sm leading-5 bg-[#27272a] text-[#b2b2b2] focus:ring-0 outline-none"
                                            displayValue={(items: Option[]) =>
                                                items.map((item) => item.name).join(', ')
                                            }
                                            placeholder="Chọn thể loại"
                                            onChange={(event) => setQuery(event.target.value)}
                                            onFocus={handleInputFocus}
                                            autoComplete="off"
                                            readOnly={isMobile}
                                            inputMode={isMobile ? "none" : "text"}
                                        />
                                        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                                            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                                        </ComboboxButton>
                                    </div>
                                    <Transition
                                        enter="transition duration-100 ease-out"
                                        enterFrom="transform scale-95 opacity-0"
                                        enterTo="transform scale-100 opacity-100"
                                        leave="transition duration-75 ease-out"
                                        leaveFrom="transform scale-100 opacity-100"
                                        leaveTo="transform scale-95 opacity-0"
                                        afterLeave={() => setQuery('')}
                                    >
                                        <ComboboxOptions className="absolute z-50 mt-1 max-h-[220px] overflow-auto rounded-lg bg-[#18181b] py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                            {filteredGenre.length === 0 &&
                                            filteredTags.length === 0 &&
                                            query !== '' ? (
                                                <div className="relative cursor-default select-none px-4 py-2 text-white">
                                                    {`Không tìm thấy thể loại "${query}"`}
                                                </div>
                                            ) : (
                                                <>
                                                    {filteredGenre.map((item) => (
                                                        <ComboboxOption
                                                            key={item.value}
                                                            className={({ active }: { active: boolean }) =>
                                                                `relative cursor-pointer select-none py-2 pl-4 pr-4 ${
                                                                    active ? 'bg-[#27272a] text-white' : 'text-[#b2b2b2]'
                                                                }`
                                                            }
                                                            value={item}
                                                        >
                                                            {({
                                                                selected,
                                                                active,
                                                            }: {
                                                                selected: boolean;
                                                                active: boolean;
                                                            }) => (
                                                                <>
                                                                    <span
                                                                        className={`block truncate ${
                                                                            selected ? 'font-medium text-white' : 'font-normal'
                                                                        }`}
                                                                    >
                                                                        {item.name}
                                                                    </span>
                                                                    {selected && (
                                                                        <span
                                                                            className={`absolute inset-y-0 right-4 flex items-center pl-3 ${
                                                                                active ? 'text-white' : ''
                                                                            }`}
                                                                        >
                                                                            <CheckIcon className="h-5 w-5" />
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </ComboboxOption>
                                                    ))}
                                                    {filteredTags.map((item) => (
                                                        <ComboboxOption
                                                            key={item.value}
                                                            className={({ active }: { active: boolean }) =>
                                                                `relative cursor-pointer select-none py-2 pl-4 pr-4 ${
                                                                    active ? 'bg-[#27272a] text-white' : 'text-[#b2b2b2]'
                                                                }`
                                                            }
                                                            value={item}
                                                        >
                                                            {({
                                                                selected,
                                                                active,
                                                            }: {
                                                                selected: boolean;
                                                                active: boolean;
                                                            }) => (
                                                                <>
                                                                    <span
                                                                        className={`block truncate ${
                                                                            selected ? 'font-medium text-white' : 'font-normal'
                                                                        }`}
                                                                    >
                                                                        {item.name}
                                                                    </span>
                                                                    {selected && (
                                                                        <span
                                                                            className={`absolute inset-y-0 right-4 flex items-center pl-3 ${
                                                                                active ? 'text-white' : ''
                                                                            }`}
                                                                        >
                                                                            <CheckIcon className="h-5 w-5" />
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </ComboboxOption>
                                                    ))}
                                                </>
                                            )}
                                        </ComboboxOptions>
                                    </Transition>
                                </Combobox>
                            </div>
                            <div className={styles.catalogsort}>
                                <h3 className={styles.searchlabel}>Lọc</h3>
                                <Select
                                    labelPlacement="outside"
                                    aria-label="Sort by"
                                    placeholder="Lọc theo"
                                    selectedKeys={sortbyvalue ? [sortbyvalue] : []}
                                    className="max-w-xs"
                                    onSelectionChange={(keys) => setSortbyvalue(getSelectedKey(keys))}
                                >
                                    {sortbyOptions.map((item) => (
                                        <SelectItem key={item.value} value={item.value}>
                                            {item.name}
                                        </SelectItem>
                                    ))}
                                </Select>
                            </div>
                            <button
                                className="hidden lg:flex items-end cursor-default"
                                onClick={resetValues}
                                disabled={isFormEmpty}
                                aria-label="Reset filters"
                            >
                                <TrashIcon className="w-6 h-6 mb-2 cursor-pointer" />
                            </button>
                            <div className={styles.yearmobil}>
                                <h3 className={styles.searchlabel}>Năm</h3>
                                <Select
                                    label=""
                                    aria-label="Year"
                                    labelPlacement="outside"
                                    placeholder="Chọn Năm"
                                    className="w-full"
                                    selectedKeys={selectedYear ? [selectedYear] : []}
                                    onSelectionChange={(keys) => setSelectedYear(getSelectedKey(keys))}
                                >
                                    {yearOptions.map((year) => (
                                        <SelectItem key={year.value} value={year.value}>
                                            {year.name}
                                        </SelectItem>
                                    ))}
                                </Select>
                            </div>
                        </div>
                        <div className={styles.bottomtwo}>
                            <div className={styles.yearmobil}>
                                <h3 className={styles.searchlabel}>Loại</h3>
                                <Select
                                    label=""
                                    aria-label="Format"
                                    labelPlacement="outside"
                                    placeholder="Chọn loại"
                                    className="w-full"
                                    selectedKeys={formatvalue ? [formatvalue] : []}
                                    onSelectionChange={(keys) => setFormatvalue(getSelectedKey(keys))}
                                >
                                    {formatOptions.map((format) => (
                                        <SelectItem key={format.value} value={format.value}>
                                            {format.name}
                                        </SelectItem>
                                    ))}
                                </Select>
                            </div>
                            <div className={styles.yearmobil}>
                                <h3 className={styles.searchlabel}>Mùa</h3>
                                <Select
                                    label=""
                                    aria-label="Season"
                                    labelPlacement="outside"
                                    placeholder="Chọn Mùa"
                                    className="w-full"
                                    selectedKeys={seasonvalue ? [seasonvalue] : []}
                                    onSelectionChange={(keys) => setSeasonvalue(getSelectedKey(keys))}
                                >
                                    {seasonOptions.map((season) => (
                                        <SelectItem key={season.value} value={season.value}>
                                            {season.name}
                                        </SelectItem>
                                    ))}
                                </Select>
                            </div>
                            <div className={styles.yearmobil}>
                                <h3 className={styles.searchlabel}>Trạng thái</h3>
                                <Select
                                    label=""
                                    aria-label="Airing status"
                                    labelPlacement="outside"
                                    placeholder="Chọn trạng thái"
                                    className="w-full"
                                    selectedKeys={airingvalue ? [airingvalue] : []}
                                    onSelectionChange={(keys) => setAiringvalue(getSelectedKey(keys))}
                                >
                                    {airingOptions.map((a) => (
                                        <SelectItem key={a.value} value={a.value}>
                                            {a.name}
                                        </SelectItem>
                                    ))}
                                </Select>
                            </div>
                        </div>
                    </>
                )}
            </div>
            <div className={styles.catalogbottom}>
                <div className={styles.catalogleft}>
                    <div className={styles.accordion}>
                        <Accordion isCompact variant="splitted" defaultExpandedKeys={['season']}>
                            <AccordionItem key="season" aria-label="Season" title="Mùa">
                                <RadioGroup
                                    color="danger"
                                    value={seasonvalue}
                                    onValueChange={setSeasonvalue}
                                >
                                    {seasonOptions.map((season) => (
                                        <Radio value={season.value} key={season.value}>
                                            {season.name}
                                        </Radio>
                                    ))}
                                </RadioGroup>
                            </AccordionItem>
                        </Accordion>
                    </div>
                    <div className={styles.accordion}>
                        <Accordion isCompact variant="splitted" defaultExpandedKeys={['format']}>
                            <AccordionItem key="format" aria-label="Format" title="Loại">
                                <RadioGroup
                                    color="danger"
                                    value={formatvalue}
                                    onValueChange={setFormatvalue}
                                >
                                    {formatOptions.map((format) => (
                                        <Radio value={format.value} key={format.value}>
                                            {format.name}
                                        </Radio>
                                    ))}
                                </RadioGroup>
                            </AccordionItem>
                        </Accordion>
                    </div>
                    <div className={styles.accordion}>
                        <Accordion isCompact variant="splitted" defaultExpandedKeys={['airing']}>
                            <AccordionItem key="airing" aria-label="Airing" title="Trạng thái">
                                <RadioGroup
                                    color="danger"
                                    value={airingvalue}
                                    onValueChange={setAiringvalue}
                                >
                                    {airingOptions.map((a) => (
                                        <Radio value={a.value} key={a.value}>
                                            {a.name}
                                        </Radio>
                                    ))}
                                </RadioGroup>
                            </AccordionItem>
                        </Accordion>
                    </div>
                    <div className={styles.accordion}>
                        <Accordion isCompact variant="splitted" defaultExpandedKeys={['year']}>
                            <AccordionItem key="year" aria-label="Year" title="Năm">
                                <div className={styles.year}>
                                    {yearOptions.map((year) => (
                                        <div
                                            key={year.value}
                                            className={`${styles.yearItem} ${
                                                selectedYear === year.value ? styles.selectedYear : styles.hoveryear
                                            }`}
                                            onClick={() => handleYearClick(year.value)}
                                        >
                                            {year.name}
                                        </div>
                                    ))}
                                </div>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </div>
                <div className={styles.catalogright}>
                    <Searchcard
                        searchvalue={searchvalue}
                        seasonvalue={seasonvalue}
                        selectedYear={selectedYear ? parseInt(selectedYear) : null}
                        formatvalue={formatvalue}
                        sortbyvalue={sortbyvalue}
                        genrevalue={genrevalue}
                        airingvalue={airingvalue}
                    />
                </div>
            </div>
        </div>
    );
}

export default Catalog;