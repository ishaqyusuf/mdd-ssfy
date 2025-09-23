import { cn } from "../../utils";
import createContextFactory from "@/utils/context-factory";
import { useEffect, useRef, useState } from "react";
import Portal from "./portal";

const { Provider: TabItemProvider, useContext: useTabItem } =
  createContextFactory(function (props: { index? }) {
    const tab = useTab();
    return {
      active: tab.activeIndex === props.index,
    };
  });
const { Provider: TabProvider, useContext: useTab } = createContextFactory(
  function (props: { value?; onValueChange? }) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [hoverStyle, setHoverStyle] = useState({});
    const [activeStyle, setActiveStyle] = useState({
      left: "0px",
      width: "0px",
    });
    const [isDarkMode, setIsDarkMode] = useState(false);
    const tabRefs = useRef<(HTMLDivElement | null)[]>([]);
    useEffect(() => {
      if (hoveredIndex !== null) {
        const hoveredElement = tabRefs.current[hoveredIndex];
        if (hoveredElement) {
          const { offsetLeft, offsetWidth } = hoveredElement;
          setHoverStyle({
            left: `${offsetLeft}px`,
            width: `${offsetWidth}px`,
          });
        }
      }
    }, [hoveredIndex]);

    useEffect(() => {
      const activeElement = tabRefs.current[activeIndex];
      if (activeElement) {
        const { offsetLeft, offsetWidth } = activeElement;
        setActiveStyle({
          left: `${offsetLeft}px`,
          width: `${offsetWidth}px`,
        });
      }
    }, [activeIndex]);

    useEffect(() => {
      requestAnimationFrame(() => {
        const overviewElement = tabRefs.current[0];
        if (overviewElement) {
          const { offsetLeft, offsetWidth } = overviewElement;
          setActiveStyle({
            left: `${offsetLeft}px`,
            width: `${offsetWidth}px`,
          });
        }
      });
    }, []);

    const toggleDarkMode = () => {
      setIsDarkMode(!isDarkMode);
      document.documentElement.classList.toggle("dark");
    };
    return {
      isDarkMode,
      tabRefs,
      activeIndex,
      hoverStyle,
      hoveredIndex,
      activeStyle,
      setHoveredIndex,
      setActiveIndex,
      ...props,
    };
  }
);
function TabBase({ children, value = null, onValueChange = null }) {
  return (
    <TabProvider
      args={[
        {
          value,
          onValueChange,
        },
      ]}
    >
      <Content>{children}</Content>
    </TabProvider>
  );
}
function Content({ children }) {
  const { isDarkMode, hoverStyle, hoveredIndex, activeStyle } = useTab();
  return (
    <div className={`flex flex-col ${isDarkMode ? "dark bg-[#0e0f11]" : ""}`}>
      <div className="relative">
        {/* Hover Highlight */}
        <div
          className="absolute h-[30px] transition-all duration-300 ease-out bg-[#0e0f1114] dark:bg-[#ffffff1a] rounded-[6px] flex items-center"
          style={{
            ...hoverStyle,
            opacity: hoveredIndex !== null ? 1 : 0,
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
        "relative flex space-x-[6px] items-center",
        props.className
      )}
    >
      {/* {props.children} */}
      {props.TabItems}
    </div>
  );
}
interface TabItemProps {
  className?: string;
  children?;
  index?;
}
function TabItem(props: TabItemProps) {
  const tabCtx = useTab();
  const { tabRefs, activeIndex, setHoveredIndex, setActiveIndex } = tabCtx;
  return (
    <TabItemProvider
      args={[
        {
          index: props.index,
        },
      ]}
    >
      <div
        ref={(el) => (tabRefs.current[props.index] = el as any)}
        className={`px-3 py-2 cursor-pointer transition-colors duration-300 h-[30px] ${
          props.index === activeIndex
            ? "text-[#0e0e10] dark:text-white"
            : "text-[#0e0f1199] dark:text-[#ffffff99]"
        }`}
        onMouseEnter={() => setHoveredIndex(props.index)}
        onMouseLeave={() => setHoveredIndex(null)}
        onClick={() => {
          setActiveIndex(props.index);
          tabCtx?.onValueChange?.(props.index);
        }}
      >
        <div className="text-sm font-[var(--www-mattmannucci-me-geist-regular-font-family)] leading-5 whitespace-nowrap flex items-center justify-center h-full">
          {/* {tab} */}
          {props.children}
        </div>
      </div>
    </TabItemProvider>
  );
}
interface TabContentProps {
  children?;
}
function TabContent(props: TabContentProps) {
  const tabItem = useTabItem();
  if (!tabItem.active) return null;
  return (
    <Portal noDelay nodeId={"tabContents"}>
      {props.children}
    </Portal>
  );
}
export const Tabs = Object.assign(TabBase, {
  Items: TabList,
  Item: TabItem,
  Content: TabContent,
});
