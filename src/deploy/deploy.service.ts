import { Injectable } from '@nestjs/common';
import {
  parseGitUrl,
  pullCode,
  buildCode,
  managePM2Service,
  installDependencies,
  checkConfig,
  DeployType,
  packageManagerMap,
} from './deploy.util';
import { AUTO_DEPLOY_PROJECT_BASE_PATH } from './deploy.constant';

/** 自动部署服务 */
@Injectable()
export class DeployService {
  /** 部署静态资源 */
  deployStaticResources(git: string): void {
    // 实现部署静态资源的逻辑
    // TODO: 实现部署静态资源的逻辑
  }

  /** 部署 Node 项目 */
  async deployNodeProject(git: string): Promise<void> {
    console.log('Node开始部署中', git);
    try {
      // 解析出用户名和仓库名
      const [username, repo] = parseGitUrl(git);
      const basePath = `${AUTO_DEPLOY_PROJECT_BASE_PATH}/${username}/${repo}`;

      // 拉取代码
      await pullCode({ basePath, git });

      // 检查配置文件
      await checkConfig({ basePath, deployType: DeployType.Node });

      // 加载配置
      const adpConfigPath = `${basePath}/adp.config.js`;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const adpConfig: { packageManager: string } = require(adpConfigPath);
      const { install: installCommand, build: buildCommand } =
        packageManagerMap[adpConfig.packageManager] ||
        packageManagerMap.default;

      // 安装依赖
      await installDependencies({ basePath, installCommand });

      // 执行打包
      await buildCode({ basePath, buildCommand });

      // 判断并启动或重启服务
      const pm2ConfigPath = `${basePath}/ecosystem.config.js`;
      const prefixName = `${username}-${repo}`;
      await managePM2Service({
        basePath,
        pm2ConfigPath,
        prefixName,
        force: true,
      });
      console.log('Node部署完成', git);
    } catch (e) {
      return Promise.reject(e.message);
    }
  }
}
