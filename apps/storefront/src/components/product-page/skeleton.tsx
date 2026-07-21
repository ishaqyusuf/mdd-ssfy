import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Label } from "@gnd/ui/label";
import { Skeleton } from "@gnd/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@gnd/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

export function ProductSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
        <Skeleton className="hover:text-gray-900 w-10 h-4"></Skeleton>
        <span>/</span>
        <Skeleton className="hover:text-gray-900 w-10 h-4"></Skeleton>
        <span>/</span>
        <Skeleton className="hover:text-gray-900 w-10 h-4"></Skeleton>
      </div>

      {/* Back Button */}
      <Skeleton>
        <Skeleton className="mb-6">
          <Skeleton className="h-4 w-4 mr-2" />
          <Skeleton className="w-16 h-4" />
        </Skeleton>
      </Skeleton>
      <div className="grid lg:grid-cols-2 gap-12 mb-12">
        {/* Product Images */}
        <div>
          <div className="space-y-4">
            <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
              <Skeleton className="w-full h-full" />
              <Skeleton className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white size-4" />
              <Skeleton className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white size-4" />
            </div>
            <div className="flex space-x-2 overflow-x-auto">
              {Array(5)
                .fill(null)
                .map((a, i) => (
                  <Skeleton
                    className="flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2"
                    key={i}
                  />
                ))}
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Skeleton className="w-full h-6" />
              </div>
              <Skeleton className="size-6" />
            </div>

            <Skeleton className="text-3xl h-3 font-bold text-gray-900 mb-2"></Skeleton>

            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={`text-lg`}>
                    ★
                  </span>
                ))}
              </div>
              <Skeleton className="text-sm w-24 h-4 text-gray-600"></Skeleton>
            </div>

            <Skeleton className="text-gray-700 mb-6 h-4 w-28"></Skeleton>
          </div>

          {/* Variants */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900">Finish</h3>
            <div className="flex flex-wrap gap-3">
              {[...Array(5)].map((variant, vi) => (
                <Skeleton
                  key={vi}
                  className={`relative flex flex-col items-center p-3 border-2 rounded-lg transition-colors`}
                >
                  <div className="w-12 h-12 rounded-md overflow-hidden mb-2">
                    <Skeleton className="w-full h-full object-cover" />
                  </div>
                  <Skeleton className="text-xs h-3 w-16 font-medium text-center"></Skeleton>

                  <Skeleton className="text-xs h-3 w-12 text-gray-500"></Skeleton>
                </Skeleton>
              ))}
            </div>
          </div>

          {/* Size Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900">Size</h3>
            <div className="grid grid-cols-2 gap-3">
              {[...Array(5)].map((variant, vi) => (
                <Skeleton
                  key={vi}
                  className={`relative flex flex-col items-center p-3 border-2 rounded-lg transition-colors`}
                >
                  <div className="w-12 h-12 rounded-md overflow-hidden mb-2">
                    <Skeleton className="w-full h-full object-cover" />
                  </div>
                  <Skeleton className="text-xs h-3 w-16 font-medium text-center"></Skeleton>

                  <Skeleton className="text-xs h-3 w-12 text-gray-500"></Skeleton>
                </Skeleton>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900">Quantity</h3>
            <div className="flex items-center space-x-2">
              <Skeleton>
                <Skeleton className="h-4 w-4" />
              </Skeleton>
              <Skeleton className="w-20 h-6 text-center" />
              <Skeleton className="">
                <Skeleton className="h-4 w-4" />
              </Skeleton>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="text-3xl h-3 w-full font-bold text-gray-900"></Skeleton>
              <Skeleton className={`text-sm font-medium`}>
                {"Out of Stock"}
              </Skeleton>
            </div>

            <div className="flex space-x-3">
              <Skeleton className="flex-1 bg-amber-700 hover:bg-amber-800">
                <Skeleton className="h-4 w-4 mr-2" />
                Add to Cart
              </Skeleton>
              <Skeleton>
                <Skeleton className={`h-4 w-4`} />
              </Skeleton>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t">
            <div className="text-center">
              <Skeleton className="h-6 w-6 mx-auto mb-2 text-amber-600" />
              <Skeleton className="text-sm font-medium">Free Delivery</Skeleton>
              <Skeleton className="text-xs text-gray-600">
                Within 50 miles
              </Skeleton>
            </div>
            <div className="text-center">
              <Skeleton className="h-6 w-6 mx-auto mb-2 text-amber-600" />
              <Skeleton className="text-sm font-medium">
                5 Year Warranty
              </Skeleton>
              <Skeleton className="text-xs text-gray-600">
                Full coverage
              </Skeleton>
            </div>
            <div className="text-center">
              <Skeleton className="h-6 w-6 mx-auto mb-2 text-amber-600" />
              <Skeleton className="text-sm font-medium">
                30 Day Returns
              </Skeleton>
              <Skeleton className="text-xs text-gray-600">
                Easy returns
              </Skeleton>
            </div>
          </div>
        </div>
      </div>
      {/* Add-ons */}
      <div className="mb-12">
        <Card>
          <CardHeader>
            <CardTitle>Recommended Add-ons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(5)].map((addon, aid) => (
              <div
                key={aid}
                className="flex items-start space-x-3 p-3 border rounded-lg"
              >
                <Skeleton className="size-4" />
                <div className="flex-1 flex space-x-3">
                  <Skeleton className="w-16 h-16 object-cover rounded-md" />
                  <div className="flex-1">
                    <Skeleton className="font-medium h-4 w-10 cursor-pointer"></Skeleton>
                    <Skeleton className="text-sm h-4 w-10 text-gray-600 mt-1"></Skeleton>
                    <Skeleton className="text-sm h-4 w-8 font-medium text-amber-600 mt-1"></Skeleton>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Product Details Tabs */}
      <div className="mb-12">
        <Tabs defaultValue="description" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="specifications">Specifications</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Description</CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="text-sm h-10 w-full text-gray-600 mt-1"></Skeleton>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="specifications" className="mt-6">
            {/* <ProductSpecifications
              specifications={currentProduct.specifications}
            /> */}
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            {/* <ProductReviews
              reviews={currentProduct.reviews}
              averageRating={currentProduct.rating}
              totalReviews={currentProduct.totalReviews}
              ratingDistribution={currentProduct.ratingDistribution}
            /> */}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
