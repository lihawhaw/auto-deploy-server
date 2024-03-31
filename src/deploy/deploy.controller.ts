import { Controller, Get, Query } from '@nestjs/common';
import { DeployService } from './deploy.service';
import {
  ApiResult,
  ApiCode,
  successResult,
  errorResult,
} from '../utils/result.util';

/** 自动部署控制器 */
@Controller('api/deploy')
export class DeployController {
  constructor(private readonly deployService: DeployService) {}

  /**
   * GET /api/deploy
   * 自动部署接口
   * @param type 部署类型，可选值为 "node" 或 "static"
   * @param git 项目 git 地址
   * @returns 返回部署结果
   */
  @Get()
  deploy(
    @Query('type') type: string,
    @Query('git') git: string,
  ): ApiResult<string> {
    if (!type || !git) {
      return errorResult('部署参数不完整');
    }

    if (type !== 'node' && type !== 'static') {
      return errorResult(
        ApiCode.UnknownError,
        '部署类型错误，只能是 "node" 或 "static"',
      );
    }

    try {
      // 根据部署类型调用相应的部署方法
      if (type === 'node') {
        this.deployService.deployNodeProject(git);
      } else {
        this.deployService.deployStaticResources(git);
      }
      return successResult('正在部署中');
    } catch (error) {
      return errorResult(ApiCode.UnknownError, error.message || '部署失败');
    }
  }
}
