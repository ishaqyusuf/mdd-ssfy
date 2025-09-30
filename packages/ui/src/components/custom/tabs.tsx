import { cn } from "../../utils";
import createContextFactory from "@/utils/context-factory";
import { useEffect, useRef, useState } from "react";
import Portal from "./portal";

const { Provider: TabItemProvider, useContext: useTabItem } =
  createContextFactory(function (props: { value? }) {
    const tab = useTab();
    return {
      active: tab.value === props.value, // tab.activeIndex === props.index,
    };
  });
const { Provider: TabProvider, useContext: useTab } = createContextFactory(
  function (props: { value?; onValueChange?; name? }) {
    const [hoverStyle, setHoverStyle] = useState({});
    const [activeElement, setActiveElement] = useState(null);
    const [activeStyle, setActiveStyle] = useState({
      left: "0px",
      width: "0px",
    });
    const [isDarkMode, setIsDarkMode] = useState(false);
    useEffect(() => {
      const _activeElement = getActiveElement(); // tabRefs.current[activeIndex];
      if (_activeElement) {
        const { offsetLeft, offsetWidth } = _activeElement;
        setActiveStyle({
          left: `${offsetLeft}px`,
          width: `${offsetWidth}px`,
        });
        setHoverStyle({
          left: `${offsetLeft}px`,
          width: `${offsetWidth}px`,
        });
      }
    }, [activeElement]);
    const getActiveElement = () => {
      if (activeElement) return activeElement;

      return document.querySelector(
        `[data-tab-name="${props.name}"] [data-tab-active="true"]`
      );
    };
    useEffect(() => {
      requestAnimationFrame(() => {
        const overviewElement = getActiveElement(); // tabRefs.current[0];
        if (overviewElement) {
          const { offsetLeft, offsetWidth } = overviewElement;
          setActiveStyle({
            left: `${offsetLeft}px`,
            width: `${offsetWidth}px`,
          });
          setHoverStyle({
            left: `${offsetLeft}px`,
            width: `${offsetWidth}px`,
          });
        }
      });
    }, []);

    return {
      isDarkMode,
      hoverStyle,
      activeStyle,
      activeElement,
      setActiveElement,
      ...props,
    };
  }
);
function TabBase({ children, value = null, name, onValueChange = null }) {
  return (
    <TabProvider
      args={[
        {
          value,
          onValueChange,
          name,
        },
      ]}
    >
      <Content>{children}</Content>
    </TabProvider>
  );
}
function Content({ children }) {
  const { isDarkMode, hoverStyle, name, activeElement, activeStyle } = useTab();
  return (
    <div data-tab-name={name} className={`flex flex-col`}>
      <div className="relative w-full ">
        {/* Hover Highlight */}
        <div
          className="absolute h-[30px] transition-all duration-300 ease-out bg-[#0e0f1114] dark:bg-[#ffffff1a] rounded-[6px] flex items-center"
          style={{
            ...hoverStyle,
            // opacity: !!activeElement ? 1 : 0,
          }}
        />
        {/* Active Indicator */}
        <div
          className="absolute bottom-[-6px] h-[2px] bg-[#0e0f11] dark:bg-white transition-all duration-300 ease-out"
          style={activeStyle}
        />
        {/* Tabs */}
        {children}
      </div>
      <div id="tabContents"></div>
    </div>
  );
}
interface TabListProps {
  className?: string;
  children?;
  TabItems?: any[];
}
function TabList(props: TabListProps) {
  return (
    <div
      className={cn(
        "relative flex w-full space-x-[6px] items-center",
        props.className
      )}
    >
      {/* {props.children} */}
      {props.children || props.TabItems}
      <div className="flex-1"></div>
      <div id="tabHeaderAction"></div>
    </div>
  );
}
interface TabItemProps {
  className?: string;
  children?;
  // index?;
  value?;
  disabled?: boolean;
}
function TabItem(props: TabItemProps) {
  const tabCtx = useTab();
  const { activeElement } = tabCtx;
  const { setActiveElement } = tabCtx;
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <TabItemProvider
      args={[
        {
          value: props.value,
        },
      ]}
    >
      <button
        ref={ref}
        disabled={props.disabled}
        data-role="tabItem"
        data-tab-active={
          ref === activeElement
          // ||
          // (!activeElement && props.value === tabCtx.value)
        }
        onMouseEnter={() => setActiveElement(ref.current)}
        onMouseLeave={() => setActiveElement(null)}
        // ref={(el) => (tabRefs.current[props.index] = el as any)}
        className={cn(
          `px-3 py-2 cursor-pointer transition-colors duration-300 h-[30px] ${
            ref === activeElement
              ? // ||
                // (!activeElement && props.value === tabCtx.value)
                "text-[#0e0e10] dark:text-white"
              : "text-[#0e0f1199] dark:text-[#ffffff99]"
          } ${props.value === tabCtx.value && "bg-primary rounded-lg text-secondary"}`
        )}
        // onMouseEnter={() => setHoveredIndex(props.index)}
        // onMouseLeave={() => setHoveredIndex(null)}
        onClick={() => {
          // setActiveIndex(props.index);
          tabCtx?.onValueChange?.(props.value);
        }}
      >
        <div className="text-sm font-[var(--www-mattmannucci-me-geist-regular-font-family)] leading-5 whitespace-nowrap flex items-center justify-center h-full">
          {props.children}
        </div>
      </button>
    </TabItemProvider>
  );
}
interface TabContentProps {
  children?;
  className?: string;
}
function TabContent(props: TabContentProps) {
  const tabItem = useTabItem();
  if (!tabItem?.active) return null;
  return (
    <Portal noDelay nodeId={"tabContents"}>
      <div className={cn(`flex flex-col pt-4 ${props.className}`)}></div>
      {props.children}
    </Portal>
  );
}
function TabsHeader({ children, className = "" }) {
  return (
    <Portal noDelay nodeId={"tabHeaderAction"}>
      {children}
    </Portal>
  );
}
export const Tabs = Object.assign(TabBase, {
  Items: TabList,
  Item: TabItem,
  Content: TabContent,
  TabsHeader,
});
