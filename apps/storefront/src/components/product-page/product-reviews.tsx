interface ProductReviewsProps {
  productId: string;
}

export async function ProductReviews({ productId }: ProductReviewsProps) {
  // const reviews = await api.shoppingProducts.getReviews.query({ productId });

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold">Reviews</h2>
      <div className="space-y-4 mt-4">
        {/* {reviews.map((review) => (
          <div key={review.id} className="border-b pb-4">
            <p className="font-bold">{review.author}</p>
            <p>Rating: {review.rating}/5</p>
            <p>{review.comment}</p>
          </div>
        ))} */}
      </div>
    </div>
  );
}
