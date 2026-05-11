"use client";

import { useEffect, useState } from "react";
import { useAllow, useIsAllowed, useUserDecrypt } from "@zama-fhe/react-sdk";
import { hexToBytes } from "viem";
import toast from "react-hot-toast";
import { useEncora } from "~~/hooks/useEncora";
import { ContentInfo } from "~~/contracts/EncoraTypes";
import { decryptText, importKey, uint32ChunksToKey } from "~~/utils/crypto";

export function AccessButton({ content, onDecrypted }: { content: ContentInfo; onDecrypted: (text: string) => void }) {
  const { requestAccess, getEncryptedKeyHandles, CONTRACT_ADDRESS } = useEncora();
  const { mutate: allow } = useAllow();
  const { data: isAllowed } = useIsAllowed({ contractAddresses: [CONTRACT_ADDRESS] as [`0x${string}`] });

  const [loading, setLoading] = useState(false);
  const [handles, setHandles] = useState<{ handle: `0x${string}`; contractAddress: `0x${string}` }[]>([]);
  const [decryptEnabled, setDecryptEnabled] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const decryptResult = useUserDecrypt({ handles }, { enabled: decryptEnabled && !!isAllowed });

  // When decrypt result arrives, reassemble AES key and decrypt content
  useEffect(() => {
    if (!decryptResult.data || handles.length === 0) return;
    (async () => {
      try {
        const plainChunks = handles.map(({ handle }) => {
          const val = decryptResult.data![handle];
          if (val === undefined) throw new Error(`Missing value for ${handle}`);
          return val as bigint;
        });
        const keyBytes = uint32ChunksToKey(plainChunks);
        const symKey = await importKey(keyBytes);
        const encBytes = hexToBytes(content.encryptedContent);
        const text = await decryptText(encBytes, symKey);
        onDecrypted(text);
        setUnlocked(true);
        toast.success("Content unlocked!");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Decryption failed";
        setErrMsg(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
        setDecryptEnabled(false);
        setHandles([]);
      }
    })();
  }, [decryptResult.data]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAccess() {
    setLoading(true);
    setErrMsg(null);
    try {
      // 1. Send requestAccess tx
      await requestAccess(content.id);
      // 2. Read the 8 euint32 handles
      const rawHandles = await getEncryptedKeyHandles(content.id);
      const h = rawHandles.map(handle => ({ handle, contractAddress: CONTRACT_ADDRESS }));
      setHandles(h);
      // 3. Authorize decryption (keypair + EIP-712)
      if (!isAllowed) allow([CONTRACT_ADDRESS]);
      setDecryptEnabled(true);
      // loading stays true until useEffect above fires
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Access failed";
      setErrMsg(msg);
      toast.error(msg);
      setLoading(false);
    }
  }

  if (unlocked) return (
    <div className="w-full py-4 rounded-xl bg-green-500/10 border border-green-500/30 text-center text-green-400 font-bold text-sm uppercase tracking-widest">
      ✓ Unlocked
    </div>
  );

  return (
    <div className="w-full space-y-2">
      <button
        type="button"
        onClick={handleAccess}
        disabled={loading || decryptResult.isFetching}
        className="w-full bg-gradient-to-r from-green-600 to-green-500 py-4 rounded-xl font-bold text-white uppercase tracking-widest hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading || decryptResult.isFetching ? (
          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Decrypting…</>
        ) : (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
            </svg>
            Unlock Content
          </>
        )}
      </button>
      {errMsg && <p className="text-xs text-red-400 text-center break-all px-1">{errMsg}</p>}
    </div>
  );
}
