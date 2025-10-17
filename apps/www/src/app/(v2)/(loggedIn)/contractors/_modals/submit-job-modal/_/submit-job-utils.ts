export default {
    totalTaskCost(tasks) {
        let total = 0;
        Object.entries(tasks || {}).map(([k, v]: [any, any]) => {
            if (v.qty > 0 && v.cost > 0) {
                total += Number(v.qty) * Number(v.cost);
            }
        });
        return total;
    },
};
