import React from 'react';
// 导入所有 Lucide Icons 作为命名空间对象
import * as LucideIcons from 'lucide-react';
// 导入作为回退的问号图标
import { CircleHelp } from 'lucide-react';

// 获取所有 LucideIcons 的命名导出键的联合类型，用于类型安全
// 这样 name prop 可以有更好的类型提示，尽管我们传入的是 string
type LucideIconName = keyof typeof LucideIcons;

// 定义组件的 props
// 继承 React.SVGProps 使得我们可以传递 size, color, className 等 SVG 属性
interface IconRendererProps extends React.SVGProps<SVGSVGElement> {
  name: string; // 从 JSON 获取的图标名称字符串
  // 可以选择在这里明确列出常用的 Lucide icon props，增强类型提示
  // size?: number | string;
  // color?: string;
  // strokeWidth?: number;
  className?: string;
  // ...其他 LucideIcon 组件接受的props
}

const IconRenderer: React.FC<IconRendererProps> = ({ name, ...rest }) => {
  // 根据传入的字符串名称，从导入的 LucideIcons 对象中查找对应的组件
  // 使用类型断言 'as LucideIconName' 帮助 TypeScript 理解 name 可能是 LucideIcons 中的一个键
  const IconCandidate = LucideIcons[name as LucideIconName];

  // 判断找到的 IconComponent 是否是一个有效的组件（检查它是否存在）
  // 如果不存在，则使用 QuestionMark 组件作为回退
  const ComponentToRender = typeof IconCandidate === 'function'
    ? IconCandidate as React.ComponentType<any> // <any> 表示接受任意 props
    : CircleHelp;

  // 渲染选定的组件，并将所有剩余的 props {...rest} 传递给它
  return <ComponentToRender {...rest} />;
};

export default IconRenderer;