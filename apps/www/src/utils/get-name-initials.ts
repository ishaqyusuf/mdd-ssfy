export function getNameInitials(name: string) {
    return name
        ?.toLocaleUpperCase()
        ?.split(" ")
        ?.map((a) => a?.[0])
        ?.filter(Boolean)
        ?.join("");
}
