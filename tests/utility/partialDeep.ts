type PartialDeep<T> =
  T extends (...args: unknown[]) => unknown ? T :
  T extends Promise<infer U> ? Promise<PartialDeep<U>> :
  {
    [P in keyof T]?: PartialDeep<T[P]>
  };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function partialDeep<T>(arg: PartialDeep<T>): T {
    return arg as T;
}
