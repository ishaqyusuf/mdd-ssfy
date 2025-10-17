export async function _useAsync<T>(
  promise: any
): Promise<[T, undefined | any]> {
  try {
    const data = await promise;
    return [data, undefined];
  } catch (err) {
    return [undefined as any, err];
  }
}
