import dayjs from "@/lib/dayjs";

export function dueDateAlert(dates): { text; color; date } {
    const today = dayjs();

    const result = {
        today: null,
        pastDues: [],
        futureDues: [],
    };

    for (const date of dates) {
        const dueDate = dayjs(date).startOf("day");
        const today = dayjs().startOf("day"); // Ensure today is properly set to start of the day
        const diff = dueDate.diff(today, "day");
        const isToday = dueDate.isSame(today, "day"); // Fix unit here

        if (isToday) {
            result.today = { text: "due today", color: "yellow", date };
        } else if (diff < 0) {
            const absDiff = Math.abs(diff);
            if (absDiff === 1) {
                result.pastDues.push({
                    text: "due yesterday",
                    color: "red",
                    date,
                });
            } else if (absDiff <= 7) {
                result.pastDues.push({
                    text: `${absDiff} days ago`,
                    color: "red",
                    date,
                });
            } else {
                result.pastDues.push({ text: "last week", color: "red", date });
            }
        } else if (diff > 0) {
            if (diff === 1) {
                result.futureDues.push({
                    text: "due tomorrow",
                    color: "green",
                    date,
                });
            } else if (diff <= 7) {
                result.futureDues.push({
                    text: `on ${dueDate.format("dddd")}`,
                    color: "blue",
                    date,
                });
            } else {
                result.futureDues.push({
                    text: "next week",
                    color: "blue",
                    date,
                });
            }
        } else {
        }

        // const dueDate = dayjs(date);
        // const diff = dueDate.diff(today, "day");
        // const isToday = dueDate.isSame(today, "date");

        // if (isToday) {
        //     result.today = { text: "due today", color: "yellow", date };
        // } else if (diff < 0) {
        //     const absDiff = Math.abs(diff);
        //     if (absDiff === 1) {
        //         result.pastDues.push({
        //             text: "due yesterday",
        //             color: "red",
        //             date,
        //         });
        //     } else if (absDiff <= 7) {
        //         result.pastDues.push({
        //             text: `${absDiff} days ago`,
        //             color: "red",
        //             date,
        //         });
        //     } else {
        //         result.pastDues.push({ text: "last week", color: "red", date });
        //     }
        // } else if (diff > 0) {
        //     console.log({ diff });
        //     if (diff === 1) {
        //         result.futureDues.push({
        //             text: "due tomorrow",
        //             color: "green",
        //             date,
        //         });
        //     } else if (diff <= 7) {
        //         result.futureDues.push({
        //             text: `on ${dueDate.format("dddd")}`,
        //             color: "blue",
        //             date,
        //         });
        //     } else {
        //         result.futureDues.push({
        //             text: "next week",
        //             color: "blue",
        //             date,
        //         });
        //     }
        // }
    }

    result.pastDues.sort((a, b) => dayjs(b.date).diff(dayjs(a.date)));

    // Sort futureDues in ascending order (soonest first)
    result.futureDues.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));

    return result.today
        ? result.today
        : result?.pastDues?.length
          ? result?.pastDues[0]
          : result?.futureDues?.length
            ? result?.futureDues[0]
            : {
                  text: "No due dates",
                  color: "gray",
                  date: null,
              };
}

//     return { text: "No due dates", color: "gray" };
// }
