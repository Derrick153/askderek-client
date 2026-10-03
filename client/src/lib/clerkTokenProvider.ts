type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;

export const setTokenGetter = (fn: TokenGetter): void => {
  tokenGetter = fn;
};

export const getClerkToken = async (): Promise<string | null> => {
  if (!tokenGetter) return null;
  try {
    return await tokenGetter();
  } catch (error) {
    console.error("[clerkTokenProvider] Failed to get token:", error);
    return null;
  }
};
