'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Image from 'next/image';
import { Modal, ModalContent, ModalBody, useDisclosure } from '@nextui-org/react';

declare global {
  interface Window {
    Coral?: {
      createStreamEmbed: (options: {
        id: string;
        autoRender?: boolean;
        rootURL: string;
        storyID: string;
        storyURL: string;
        accessToken?: string;
        refreshAccessToken?: (setNext: (nextAccessToken: string) => void) => void;
        events?: (events: { on: (eventName: string, cb: () => void) => void }) => void;
      }) => { login: (token: string) => void; logout: () => void };
    };
  }
}

interface CoralProps {
  storyId: string;
  storyUrl: string;
}

const CORAL_ROOT_URL = process.env.NEXT_PUBLIC_CORAL_URL || 'http://localhost:4000';

async function fetchCoralToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/coral/token');
    const data = await res.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Loader dùng chung cho toàn app (module-level, KHÔNG phải ref trong component).
 * `window.Coral` là biến global do embed.js tự set, nên việc load script
 * cũng phải là một tác vụ global — chỉ chạy đúng 1 lần dù component có
 * mount/unmount (Strict Mode double-invoke ở dev, hoặc remount qua `key`)
 * bao nhiêu lần đi nữa. Đây chính là nguyên nhân gây lỗi "vào trang lần đầu
 * không thấy comment, phải F5 mới ra": trước đây dùng `scriptLoadedRef`
 * (ref riêng của từng instance) để canh script đã load hay chưa, nên khi
 * React mount 2 lần liên tiếp, có trường hợp `onload` của lần mount đầu
 * không kịp gọi `renderEmbed()` cho lần mount "sống sót", khiến div
 * #coral_thread trống cho tới khi reload full trang.
 */
let coralScriptPromise: Promise<void> | null = null;

function loadCoralScript(): Promise<void> {
  if (typeof window !== 'undefined' && window.Coral) {
    return Promise.resolve();
  }
  if (coralScriptPromise) {
    return coralScriptPromise;
  }

  coralScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${CORAL_ROOT_URL}/assets/js/embed.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Cho phép retry ở lần mount sau nếu script load fail (vd mạng chập chờn)
      coralScriptPromise = null;
      reject(new Error('Failed to load Coral embed script'));
    };
    document.body.appendChild(script);
  });

  return coralScriptPromise;
}

function CoralStreamWidget({
  storyId,
  storyUrl,
  onNeedLogin,
}: CoralProps & { onNeedLogin: () => void }) {
  const { status } = useSession();
  const embedRef = useRef<{ login: (t: string) => void; logout: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await loadCoralScript();
        if (cancelled || !window.Coral) return;
        await renderEmbed();
      } catch (err) {
        console.error('Coral init error:', err);
      }
    }

    async function renderEmbed() {
      if (!window.Coral) return;
      const accessToken = await fetchCoralToken();
      if (cancelled) return;

      const embed = window.Coral.createStreamEmbed({
        id: 'coral_thread',
        autoRender: true,
        rootURL: CORAL_ROOT_URL,
        storyID: storyId,
        storyURL: storyUrl,
        accessToken: accessToken ?? undefined,
        refreshAccessToken: async (setNext) => {
          const next = await fetchCoralToken();
          if (next) setNext(next);
        },
        events: (events) => {
          events.on('loginPrompt', async () => {
            // Cả hai nhánh (đã có session AniList hay chưa) đều cần cha xử
            // lý remount/hiện modal, nên gọi onNeedLogin() chung.
            onNeedLogin();
          });
        },
      });

      if (!cancelled) {
        embedRef.current = embed;
      }
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId, storyUrl]);

  useEffect(() => {
    if (!embedRef.current) return;

    if (status === 'authenticated') {
      fetchCoralToken().then((token) => {
        if (token) embedRef.current?.login(token);
      });
    } else if (status === 'unauthenticated') {
      embedRef.current?.logout();
    }
  }, [status]);

  return <div id="coral_thread"></div>;
}

export default function CoralComments({ storyId, storyUrl }: CoralProps) {
  const [remountTick, setRemountTick] = useState(0);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const handleNeedLogin = useCallback(async () => {
    const token = await fetchCoralToken();
    if (token) {
      setRemountTick((n) => n + 1);
    } else {
      onOpen();
    }
  }, [onOpen]);

  return (
    <div className="w-full mt-8">
      {/* Heading nằm NGOÀI div bọc Coral */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="w-[0.3rem] h-8 rounded-md bg-white shrink-0" />
        <h3 className="text-[24px] font-medium text-white m-0">Thảo luận</h3>
      </div>
      <div className="border-t border-white/10 mb-4" />

      {/* Từ đây mới bắt đầu div lớn bọc nguyên comment section */}
      <div className="p-4 bg-[#18181b] rounded-lg text-white">
        <CoralStreamWidget
          key={remountTick}
          storyId={storyId}
          storyUrl={storyUrl}
          onNeedLogin={handleNeedLogin}
        />
      </div>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="xs"
        backdrop="opaque"
        hideCloseButton
        placement="center"
        radius="sm"
        classNames={{ body: 'py-6 px-3' }}
      >
        <ModalContent>
          {() => (
            <ModalBody>
              <div className="text-center flex flex-col justify-center items-center">
                <p className="text-lg mb-3">Đăng nhập để bình luận.</p>
                <button
                  className="font-semibold outline-none border-none py-2 px-4 bg-[#4d148c] rounded-md flex items-center"
                  onClick={() => signIn('AniListProvider')}
                >
                  <Image alt="anilist-icon" loading="lazy" width={25} height={25} src="/anilist.svg" className="mr-2" />
                  Đăng nhập Anilist
                </button>
              </div>
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}