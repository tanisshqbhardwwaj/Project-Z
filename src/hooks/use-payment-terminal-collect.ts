"use client";

import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import type {
  TerminalCollectResult,
  TerminalPaymentStatus,
} from "@/lib/shop/payment-terminal/types";

const POLL_MS = 10_000;
const MAX_POLLS = 36;

type StatusResponse = {
  status: TerminalPaymentStatus;
  paymentMethod?: "CARD" | "UPI" | "OTHER";
  reference?: string;
  message?: string;
};

export type TerminalCollectOutcome = {
  paymentMethod: "CARD" | "UPI";
  reference?: string;
  collect: TerminalCollectResult;
};

export function usePaymentTerminalCollect() {
  const [collecting, setCollecting] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const cancelCollect = useCallback(() => {
    cancelRef.current = true;
    setCollecting(false);
    setHint(null);
  }, []);

  const collectPayment = useCallback(
    async (amountPaise: bigint, preferredMethod: "CARD" | "UPI"): Promise<TerminalCollectOutcome> => {
      cancelRef.current = false;
      setCollecting(true);
      setHint("Sending amount to card machine…");

      try {
        const collect = await apiFetch<TerminalCollectResult>(
          "/api/v1/shop/payment-terminal/request",
          {
            method: "POST",
            body: JSON.stringify({ amountPaise: amountPaise.toString() }),
          }
        );

        setHint(collect.displayHint);

        for (let i = 0; i < MAX_POLLS; i++) {
          if (cancelRef.current) {
            throw new Error("Payment collection cancelled");
          }

          if (i > 0) {
            await sleep(POLL_MS);
          } else {
            await sleep(3_000);
          }

          const status = await apiFetch<StatusResponse>(
            "/api/v1/shop/payment-terminal/status",
            {
              method: "POST",
              body: JSON.stringify({
                externalId: collect.externalId,
                txnDate: collect.txnDate,
                merchantTxnId: collect.merchantTxnId,
              }),
            }
          );

          if (status.status === "COMPLETED") {
            const method =
              status.paymentMethod === "UPI"
                ? "UPI"
                : status.paymentMethod === "CARD"
                  ? "CARD"
                  : preferredMethod;
            return {
              paymentMethod: method,
              reference: status.reference,
              collect,
            };
          }

          if (
            status.status === "FAILED" ||
            status.status === "EXPIRED" ||
            status.status === "CANCELLED"
          ) {
            throw new Error(status.message ?? `Payment ${status.status.toLowerCase()}`);
          }

          setHint(
            collect.displayHint +
              (status.status === "IN_QUEUE" ? " — waiting on machine…" : " — processing…")
          );
        }

        throw new Error("Payment timed out — check the machine or try again");
      } finally {
        setCollecting(false);
        setHint(null);
      }
    },
    []
  );

  return { collecting, hint, collectPayment, cancelCollect };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
