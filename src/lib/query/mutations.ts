"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";

type MutationOpts<TData, TVariables> = Omit<
  UseMutationOptions<TData, Error, TVariables>,
  "mutationFn"
> & {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidateKeys?: readonly (readonly unknown[])[];
};

export function useAppMutation<TData, TVariables>(
  opts: MutationOpts<TData, TVariables>
) {
  const queryClient = useQueryClient();
  const { invalidateKeys, ...mutationOpts } = opts;

  return useMutation({
    ...mutationOpts,
    onSuccess: (data, variables, context) => {
      if (invalidateKeys) {
        for (const key of invalidateKeys) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      }
      mutationOpts.onSuccess?.(data, variables, context);
    },
  });
}
