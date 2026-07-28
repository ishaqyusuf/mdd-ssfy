import { memo } from "react";

export const typedMemo: <Component extends React.FC<any>>(
  component: Component,
  compare?: (
    prevProps: React.ComponentPropsWithoutRef<Component>,
    newPRops: React.ComponentPropsWithoutRef<Component>
  ) => boolean
) => Component = memo;
