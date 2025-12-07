import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Link2, Plus, Trash2, Edit } from 'lucide-react';
import { ProductMappingForm } from '@/components/admin/ProductMappingForm';

export default async function AdminProductsPage() {
  const [products, courses] = await Promise.all([
    prisma.productMapping.findMany({
      include: {
        course: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.course.findMany({
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GHL Product Mappings</h1>
          <p className="text-gray-600 mt-1">
            Link GoHighLevel products to courses for automatic enrollment
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-medium text-blue-900 mb-2">How Product Mappings Work</h3>
          <p className="text-sm text-blue-800">
            When a customer purchases a product in GoHighLevel, the webhook sends the product ID.
            If that product ID is mapped here, the customer will automatically be enrolled in the
            corresponding course. You can also enable &quot;Grant All Courses&quot; to give access to
            every course with a single product (useful for bundles).
          </p>
        </CardContent>
      </Card>

      {/* Add New Mapping */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-bold text-gray-900 mb-4">Add Product Mapping</h3>
          <ProductMappingForm courses={courses} />
        </CardContent>
      </Card>

      {/* Existing Mappings */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b">
            <h3 className="font-bold text-gray-900">Current Mappings</h3>
          </div>

          {products.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Link2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No product mappings yet</p>
              <p className="text-sm">Add a mapping above to get started</p>
            </div>
          ) : (
            <div className="divide-y">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {product.ghlProductName || product.ghlProductId}
                        </p>
                        <p className="text-sm text-gray-500">
                          ID: <code className="bg-gray-100 px-1 rounded">{product.ghlProductId}</code>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      {product.grantAll ? (
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded font-medium">
                          All Courses
                        </span>
                      ) : (
                        <span className="text-sm text-gray-600">
                          {product.course.title}
                        </span>
                      )}
                    </div>

                    <span
                      className={`px-2 py-1 text-xs rounded font-medium ${
                        product.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {product.active ? 'Active' : 'Inactive'}
                    </span>

                    <form action={`/api/admin/products/${product.id}/delete`} method="POST">
                      <button
                        type="submit"
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
