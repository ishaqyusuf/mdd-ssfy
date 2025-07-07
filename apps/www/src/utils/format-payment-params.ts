export function formatPaymentParams(params) {
    const { emailToken, orderIds } = params;
    return {
        emailToken,
        orderIdsParam: orderIds,
        orderIds: transformPaymentOrderIds(orderIds),
        paymentId: params.paymentId,
    };
}

export function transformPaymentOrderIds(orderIds): string[] {
    return orderIds?.split("-").map((a) => a.replaceAll("_", "-"));
}
export function composePaymentOrderIdsParam(orderIds: string[]) {
    return orderIds
        ?.filter(Boolean)
        .map((a) => a?.replaceAll("-", "_"))
        .join("-");
}
