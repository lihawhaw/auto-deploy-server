/** API 返回结果 */
export class ApiResult<T> {
  constructor(
    public readonly code: ApiCode,
    public readonly data?: T,
    public readonly message?: string,
  ) {}
}

/** API 返回代码枚举 */
export enum ApiCode {
  Success = 0,
  UnknownError = 10000,
  // 定义其他错误代码...
}

/**
 * 成功返回结果
 * @param data 返回的数据
 * @param message 返回的消息
 * @returns 成功的 API 返回结果对象
 */
export function successResult<T>(
  data: T,
  message: string = '操作成功',
): ApiResult<T> {
  return new ApiResult(ApiCode.Success, data, message);
}

/**
 * 错误返回结果
 * @param errorCodeOrMessage 错误代码枚举或错误消息
 * @param messageOrCode 错误消息或错误代码枚举（可选）
 * @param data 错误数据
 * @returns 错误的 API 返回结果对象
 */
export function errorResult<T>(
  errorCodeOrMessage: ApiCode | string,
  messageOrCode?: string | ApiCode,
  data: T | null = null,
): ApiResult<T> {
  let code: ApiCode = ApiCode.UnknownError;
  let message = '';
  if (typeof errorCodeOrMessage === 'number') {
    code = errorCodeOrMessage;
    message = (messageOrCode as string) || '未知错误';
  } else {
    message = errorCodeOrMessage;
    code =
      typeof messageOrCode === 'number' ? messageOrCode : ApiCode.UnknownError;
  }
  return new ApiResult<T>(code, data, message);
}
