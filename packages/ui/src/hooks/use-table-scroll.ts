"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseTableScrollOptions {
  scrollAmount?: number;
  useColumnWidths?: boolean;
  startFromColumn?: number;
}

function isTextInputTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

export function useTableScroll(options: UseTableScrollOptions = {}) {
  const {
    scrollAmount = 120,
    useColumnWidths = false,
    startFromColumn = 0,
  } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);
  const currentColumnIndex = useRef(startFromColumn);
  const isScrollingProgrammatically = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const getColumnPositions = useCallback(() => {
    const container = containerRef.current;
    if (!container) return [];

    const table = container.querySelector("table");
    if (!table) return [];

    const headerRow = table.querySelector("thead tr");
    if (!headerRow) return [];

    const columns = Array.from(headerRow.querySelectorAll("th"));
    const positions: number[] = [];
    let currentPosition = 0;

    for (const column of columns) {
      positions.push(currentPosition);
      currentPosition += (column as HTMLElement).offsetWidth;
    }

    return positions;
  }, []);

  const getColumnIndexForScrollLeft = useCallback(
    (allColumnPositions: number[], currentScrollLeft: number) => {
      const container = containerRef.current;
      if (!container) return startFromColumn;

      const maxScrollLeft = container.scrollWidth - container.clientWidth;

      if (currentScrollLeft <= 10) {
        return startFromColumn;
      }

      if (currentScrollLeft >= maxScrollLeft - 10) {
        return allColumnPositions.length - 1;
      }

      let accumulatedDistance = 0;
      let detectedColumn = startFromColumn;

      for (let i = startFromColumn; i < allColumnPositions.length - 1; i++) {
        const columnStart = allColumnPositions[i] ?? 0;
        const columnEnd = allColumnPositions[i + 1] ?? 0;
        const columnWidth = columnEnd - columnStart;
        const nextDistance = accumulatedDistance + columnWidth;

        if (
          Math.abs(currentScrollLeft - accumulatedDistance) <=
          Math.abs(currentScrollLeft - nextDistance)
        ) {
          detectedColumn = i;
          break;
        }

        accumulatedDistance = nextDistance;
        detectedColumn = i + 1;
      }

      return Math.max(
        startFromColumn,
        Math.min(detectedColumn, allColumnPositions.length - 1),
      );
    },
    [startFromColumn],
  );

  const syncColumnIndex = useCallback(() => {
    const container = containerRef.current;
    if (!container || !useColumnWidths || isScrollingProgrammatically.current)
      return;

    const allColumnPositions = getColumnPositions();
    if (allColumnPositions.length === 0) return;

    currentColumnIndex.current = getColumnIndexForScrollLeft(
      allColumnPositions,
      container.scrollLeft,
    );
  }, [useColumnWidths, getColumnPositions, getColumnIndexForScrollLeft]);

  const checkScrollability = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollWidth, clientWidth } = container;
    const isScrollableTable = scrollWidth > clientWidth;

    setIsScrollable(isScrollableTable);

    if (!isScrollableTable) {
      currentColumnIndex.current = startFromColumn;
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    if (useColumnWidths) {
      const allColumnPositions = getColumnPositions();
      const maxColumnIndex = allColumnPositions.length - 1;

      if (!isScrollingProgrammatically.current) {
        currentColumnIndex.current = getColumnIndexForScrollLeft(
          allColumnPositions,
          container.scrollLeft,
        );
      }

      const newCanScrollLeft =
        currentColumnIndex.current > startFromColumn ||
        container.scrollLeft > 10;
      const newCanScrollRight = currentColumnIndex.current < maxColumnIndex;

      setCanScrollLeft(newCanScrollLeft);
      setCanScrollRight(newCanScrollRight);
    } else {
      const { scrollLeft } = container;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, [
    useColumnWidths,
    startFromColumn,
    getColumnPositions,
    getColumnIndexForScrollLeft,
  ]);

  const scrollLeft = useCallback(
    (smooth = true) => {
      const container = containerRef.current;
      if (!container) return;

      if (useColumnWidths) {
        const allColumnPositions = getColumnPositions();
        if (allColumnPositions.length === 0) return;

        if (
          currentColumnIndex.current <= startFromColumn &&
          container.scrollLeft <= 0
        ) {
          return;
        }

        if (
          currentColumnIndex.current <= startFromColumn &&
          container.scrollLeft > 0
        ) {
          isScrollingProgrammatically.current = true;
          container.scrollTo({
            left: 0,
            behavior: "smooth",
          });

          setTimeout(() => {
            isScrollingProgrammatically.current = false;
            syncColumnIndex();
            checkScrollability();
          }, 500);
          return;
        }

        const originalColumnIndex = currentColumnIndex.current;
        currentColumnIndex.current = currentColumnIndex.current - 1;

        const currentScrollLeft = container.scrollLeft;
        const maxScrollLeft = container.scrollWidth - container.clientWidth;

        let targetScrollLeft: number;

        if (Math.abs(currentScrollLeft - maxScrollLeft) < 10) {
          const lastColumnStart = allColumnPositions[originalColumnIndex] ?? 0;
          const lastColumnEnd =
            allColumnPositions[originalColumnIndex + 1] ??
            lastColumnStart + 150;
          const lastColumnWidth = lastColumnEnd - lastColumnStart;

          targetScrollLeft = Math.max(0, currentScrollLeft - lastColumnWidth);
        } else {
          targetScrollLeft = 0;
          for (let i = startFromColumn; i < currentColumnIndex.current; i++) {
            const columnStart = allColumnPositions[i] ?? 0;
            const columnEnd = allColumnPositions[i + 1] ?? 0;
            const columnWidth = columnEnd - columnStart;
            targetScrollLeft += columnWidth;
          }
        }

        isScrollingProgrammatically.current = true;

        container.scrollTo({
          left: targetScrollLeft,
          behavior: "smooth",
        });

        setTimeout(() => {
          isScrollingProgrammatically.current = false;
          syncColumnIndex();
          checkScrollability();
        }, 500);
      } else {
        container.scrollBy({
          left: -scrollAmount,
          behavior: smooth ? "smooth" : "auto",
        });
      }
    },
    [scrollAmount, useColumnWidths, startFromColumn, getColumnPositions],
  );

  const scrollRight = useCallback(
    (smooth = true) => {
      const container = containerRef.current;
      if (!container) return;

      if (useColumnWidths) {
        const allColumnPositions = getColumnPositions();
        if (allColumnPositions.length === 0) return;
        const maxColumnIndex = allColumnPositions.length - 1;

        // Only proceed if we can scroll right
        if (currentColumnIndex.current >= maxColumnIndex) {
          return;
        }

        // Increment the column index
        currentColumnIndex.current = currentColumnIndex.current + 1;

        // Flag that we're scrolling programmatically
        isScrollingProgrammatically.current = true;

        // If this is the last column, scroll to the absolute end
        if (currentColumnIndex.current === maxColumnIndex) {
          container.scrollTo({
            left: container.scrollWidth - container.clientWidth,
            behavior: "smooth",
          });
        } else {
          // Calculate scroll position for this column
          let targetScrollLeft = 0;
          for (let i = startFromColumn; i < currentColumnIndex.current; i++) {
            const columnStart = allColumnPositions[i] ?? 0;
            const columnEnd = allColumnPositions[i + 1] ?? 0;
            targetScrollLeft += columnEnd - columnStart;
          }

          container.scrollTo({
            left: targetScrollLeft,
            behavior: "smooth",
          });
        }

        setTimeout(() => {
          isScrollingProgrammatically.current = false;
          syncColumnIndex();
          checkScrollability();
        }, 500);
      } else {
        container.scrollBy({
          left: scrollAmount,
          behavior: smooth ? "smooth" : "auto",
        });
      }
    },
    [scrollAmount, useColumnWidths, startFromColumn, getColumnPositions],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Reset column index and check scrollability on mount and resize
    currentColumnIndex.current = startFromColumn;
    checkScrollability();

    // Debounced scroll handler to prevent excessive updates during manual scrolling
    const handleScroll = () => {
      // Ignore scroll events during programmatic scrolling to prevent conflicts
      if (isScrollingProgrammatically.current) return;

      // Clear previous timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Debounce the scroll handling
      scrollTimeoutRef.current = setTimeout(() => {
        checkScrollability();
      }, 100);
    };

    const handleResize = () => {
      currentColumnIndex.current = startFromColumn;
      checkScrollability();
    };

    container.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);

    // Use ResizeObserver to detect table content changes
    const resizeObserver = new ResizeObserver(() => {
      currentColumnIndex.current = startFromColumn;
      checkScrollability();
    });

    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();

      // Clear any pending scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [checkScrollability, startFromColumn]);

  useEffect(() => {
    if (!isScrollable) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextInputTarget(event.target)) return;

      if (event.key === "ArrowLeft" && canScrollLeft) {
        event.preventDefault();
        scrollLeft();
      }
      if (event.key === "ArrowRight" && canScrollRight) {
        event.preventDefault();
        scrollRight();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canScrollLeft, canScrollRight, isScrollable, scrollLeft, scrollRight]);

  return {
    containerRef,
    canScrollLeft,
    canScrollRight,
    isScrollable,
    scrollLeft,
    scrollRight,
  };
}
