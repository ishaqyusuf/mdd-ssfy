import { useEffect, useState } from "react";

export default function useStaticDataLoader(
    fn,
    { onSuccess = null, onError = null }: any
) {
    const [items, setItems] = useState(fn ? [] : null);

    useEffect(() => {
        if (fn) {
            fn().then((data) => {
                console.log(data);

                setItems(data);
                onSuccess && onSuccess(data);
            });
        }
    }, []);

    return {
        fn,
        items,
    };
}
