import * as fs from 'fs';
import * as util from 'util';
import * as child_process from 'child_process';
import * as pm2 from 'pm2';
import simpleGit, { SimpleGit } from 'simple-git';

const exec = util.promisify(child_process.exec);

/** 部署类型枚举 */
export enum DeployType {
  Node = 'node',
  Static = 'static',
}

/**
 * 解析 git 仓库地址，返回用户名和仓库名
 * @param git git 仓库地址
 * @returns [username, repo] 用户名和仓库名
 */
export function parseGitUrl(git: string): [string, string] {
  const [, username, repo] = git.match(/github.com:(.*)\/(.*).git/) || [];
  return [username, repo];
}

/**
 * 拉取代码
 * @param options 拉取代码选项
 */
export async function pullCode(options: {
  basePath: string;
  git: string;
  depth?: number;
}): Promise<void> {
  const { basePath, git: repoUrl, depth } = options;

  if (fs.existsSync(basePath)) {
    // 目录存在，先取消本地的修改
    const git: SimpleGit = simpleGit(basePath);
    await git.reset(['--hard']);

    // 拉取最新的代码，如果指定了深度参数，则只拉取指定深度的历史记录
    const pullOptions = depth ? ['--depth', depth.toString()] : [];
    await git.pull(...pullOptions);
  } else {
    // 目录不存在，直接克隆代码
    await simpleGit().clone(
      repoUrl,
      basePath,
      depth ? ['--depth', depth.toString()] : [],
    );
  }
}

/**
 * 执行打包
 * @param options 打包选项
 */
export async function buildCode(options: {
  basePath: string;
  buildCommand?: string;
  preBuildCode?: () => Promise<void>;
}): Promise<void> {
  if (options.preBuildCode) {
    await options.preBuildCode();
  }

  const { basePath, buildCommand } = options;

  // 判断是否存在构建命令，优先使用构建命令，否则使用默认的打包命令
  const commandToExecute = buildCommand ? buildCommand : 'pnpm build';

  // 执行构建命令
  await executeCommand(`cd ${basePath} && ${commandToExecute}`);
}

/**
 * 执行安装
 * @param options 安装选项
 */
export async function installDependencies(options: {
  basePath: string;
  installCommand?: string;
}): Promise<void> {
  const { basePath, installCommand } = options;

  // 判断是否存在安装命令，优先使用安装命令，否则使用默认的安装命令
  const commandToExecute = installCommand ? installCommand : 'pnpm install';

  // 执行安装命令
  await executeCommand(`cd ${basePath} && ${commandToExecute}`);
}

interface ManageServiceOptions {
  basePath: string;
  pm2ConfigPath: string;
  force?: boolean;
  prefixName?: string;
}

/**
 * 判断并启动或重启服务
 * @param options 服务管理选项
 */
export async function managePM2Service(
  options: ManageServiceOptions,
): Promise<void> {
  const { pm2ConfigPath, force = false, prefixName, basePath } = options;

  // 连接到 pm2
  await new Promise<void>((resolve, reject) => {
    pm2.connect((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const pm2Options = getPM2OptionsByFile({
    basePath,
    filePath: pm2ConfigPath,
    prefixName,
  });

  if (force) {
    // 删除原有服务
    await deleteServices(pm2Options.apps);
  }

  // 启动服务
  await new Promise<void>((resolve, reject) => {
    pm2.start(pm2Options, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // 断开与 pm2 的连接
  pm2.disconnect();
}

/**
 * 删除原有服务
 * @param pm2Options PM2 启动配置对象数组
 */
async function deleteServices(pm2Options: any[]): Promise<void> {
  const promises = pm2Options.map((app) => {
    return new Promise<void>((resolve, reject) => {
      pm2.delete(app.name, (err: any) => {
        if (err && err.message.indexOf('not found') === -1) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });

  try {
    await Promise.all(promises);
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
}
/**
 * 执行命令
 * @param command 要执行的命令
 * @returns Promise<void>
 */
async function executeCommand(command: string): Promise<void> {
  try {
    await exec(command);
  } catch (error) {
    throw error;
  }
}

/**
 * 检查配置文件是否有效
 * @param basePath 项目基础路径
 * @param deployType 部署类型
 * @returns 是否有效
 */
export async function checkConfig(options: {
  basePath: string;
  deployType: DeployType;
}): Promise<void> {
  const { basePath, deployType } = options;
  const adpConfigPath = `${basePath}/adp.config.js`;
  if (!fileExists(adpConfigPath)) {
    throw new Error('adp.config.js 文件不存在');
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const adpConfig = require(adpConfigPath);

  if (!adpConfig.packageManager) {
    throw new Error('配置文件缺少 packageManager');
  }

  if (!adpConfig.port) {
    throw new Error('配置文件缺少 port');
  }

  if (deployType === DeployType.Node) {
    const ecosystemConfigPath = `${basePath}/ecosystem.config.js`;
    if (!fileExists(ecosystemConfigPath)) {
      throw new Error('ecosystem.config.js 文件不存在');
    }
  }
}

/**
 * 判断文件是否存在
 * @param filePath 文件路径
 * @returns 是否存在
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * 根据 packageManager 设置安装和构建命令
 */
export const packageManagerMap = {
  yarn: {
    install: 'yarn install',
    build: 'yarn build',
  },
  npm: {
    install: 'npm install',
    build: 'npm run build',
  },
  default: {
    install: 'pnpm install',
    build: 'pnpm build',
  },
};

interface PM2Options {
  filePath: string;
  basePath: string;
  prefixName?: string;
}

/**
 * 从 ecosystem.config.js 文件中获取启动配置，并将路径相关属性与 basePath 拼接
 * @param options 包含 filePath、basePath 和 prefixName 的对象
 * @returns 拼接后的启动配置对象
 */
export function getPM2OptionsByFile(options: PM2Options): any {
  const { filePath, basePath, prefixName } = options;

  try {
    // 读取文件内容
    const content = fs.readFileSync(filePath, 'utf-8');

    // 解析文件内容
    const config = eval(`${content}`);

    // 假设配置对象中有一个名为 apps 的属性，包含了启动配置信息
    const pm2Options = config.apps;

    // 遍历配置对象，将路径相关属性与 basePath 拼接
    for (const app of pm2Options) {
      if (app.script) {
        app.script = `${basePath}/${app.script}`;
      }
      if (app.out_log) {
        app.out_log = `${basePath}/${app.out_log}`;
      }
      if (app.error_log) {
        app.error_log = `${basePath}/${app.error_log}`;
      }
      // 修改 app.name，如果提供了 prefixName 参数
      if (prefixName) {
        app.name = `${prefixName}-${app.name}`;
      }
    }

    return { ...config, apps: pm2Options };
  } catch (e) {
    throw new Error(e);
  }
}
