type RefreshType = "components";
export function triggerRefresh(form, rowIndex, type: RefreshType) {
    const uid = form.getValues(`itemArray.${rowIndex}.uid`);
    console.log(uid);
    const stepIndex = form.getValues(`itemArray.${rowIndex}.stepIndex`);
    form.setValue(`itemArray.${rowIndex}.stepIndex`, -1);
    setTimeout(() => {
        form.setValue(`itemArray.${rowIndex}.stepIndex`, stepIndex);
    }, 1000);
    form.setValue(`_refresher.${uid}.${type}`);
}
