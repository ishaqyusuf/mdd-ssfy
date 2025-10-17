export default function transformOptions<T>(items: T[], valueKey, labelKey) {
    return items.map((item) => {
        return {
            item,
            value: item[valueKey],
            text: item[labelKey],
        };
    });
}
