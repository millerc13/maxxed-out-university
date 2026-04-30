/**
 * GoHighLevel Integration Utilities
 *
 * Setup Instructions:
 *
 * 1. In GHL, go to Settings → Webhooks
 * 2. Add a new webhook:
 *    - URL: https://university.maxxedout.com/api/webhooks/ghl
 *    - Events: Order/Invoice Created, Payment Success
 *
 * 3. In your database, create ProductMapping records:
 *    - ghlProductId: The product ID from GHL (find in URL when editing product)
 *    - courseId: Your internal course ID from the Course table
 *    - grantAll: Set to true for "all access" bundles
 */

const GHL_API_V1_BASE = 'https://rest.gohighlevel.com/v1';
const GHL_API_V2_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

interface GHLContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tags?: string[];
}

/**
 * Add a tag to a GHL contact (e.g., when they complete a course)
 */
export async function addTagToContact(contactId: string, tag: string): Promise<boolean> {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    console.warn('GHL_API_KEY not configured');
    return false;
  }

  try {
    const response = await fetch(`${GHL_API_V1_BASE}/contacts/${contactId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tags: [tag],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to add tag to GHL contact:', error);
    return false;
  }
}

/**
 * Get contact details from GHL
 */
export async function getContact(contactId: string): Promise<GHLContact | null> {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    console.warn('GHL_API_KEY not configured');
    return null;
  }

  try {
    const response = await fetch(`${GHL_API_V1_BASE}/contacts/${contactId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.contact;
  } catch (error) {
    console.error('Failed to get GHL contact:', error);
    return null;
  }
}

/**
 * Common tags to add based on course progress
 */
export const GHL_TAGS = {
  // Enrollment tags
  ENROLLED_PREFIX: 'enrolled-',           // e.g., "enrolled-real-estate-101"

  // Progress tags
  STARTED_PREFIX: 'started-',             // e.g., "started-real-estate-101"
  HALFWAY_PREFIX: 'halfway-',             // e.g., "halfway-real-estate-101"
  COMPLETED_PREFIX: 'completed-',         // e.g., "completed-real-estate-101"

  // Achievement tags
  FIRST_COURSE: 'completed-first-course',
  POWER_LEARNER: 'power-learner',         // Completed 3+ courses
  ALL_COURSES: 'completed-all-courses',

  // Engagement tags
  ACTIVE_STUDENT: 'active-student',       // Logged in within 7 days
  INACTIVE_STUDENT: 'inactive-student',   // No login for 30+ days
};

/**
 * Generate a tag name for a course event
 */
export function getCourseTag(prefix: string, courseSlug: string): string {
  return `${prefix}${courseSlug}`;
}

/**
 * Sync course completion to GHL
 * Call this when a student completes a course
 */
export async function syncCourseCompletion(
  ghlContactId: string | null,
  courseSlug: string
): Promise<void> {
  if (!ghlContactId) return;

  const tag = getCourseTag(GHL_TAGS.COMPLETED_PREFIX, courseSlug);
  await addTagToContact(ghlContactId, tag);
}

/**
 * Sync course start to GHL
 * Call this when a student starts their first lesson
 */
export async function syncCourseStart(
  ghlContactId: string | null,
  courseSlug: string
): Promise<void> {
  if (!ghlContactId) return;

  const tag = getCourseTag(GHL_TAGS.STARTED_PREFIX, courseSlug);
  await addTagToContact(ghlContactId, tag);
}

// ============================================================================
// GHL Products API (V2)
// ============================================================================

interface GHLProductPrice {
  _id?: string;
  name: string;
  type: 'one_time' | 'recurring';
  amount: number;
  currency: string;
}

interface GHLProduct {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  locationId: string;
  prices?: GHLProductPrice[];
}

interface UpdateProductResult {
  success: boolean;
  error?: string;
}

interface CreateProductParams {
  name: string;
  description?: string;
  image?: string;
  price?: number; // in cents
  locationId: string;
}

interface CreateProductResult {
  success: boolean;
  product?: GHLProduct;
  error?: string;
}

/**
 * Create a product in GoHighLevel
 * Uses V2 API with required Version header
 */
export async function createProduct(params: CreateProductParams): Promise<CreateProductResult> {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'GHL_API_KEY not configured' };
  }

  try {
    // Create product with proper DIGITAL format
    const body: Record<string, any> = {
      name: params.name,
      locationId: params.locationId,
      productType: 'DIGITAL',
      availableInStore: true,
      statementDescriptor: params.name.substring(0, 22),
    };

    if (params.description) {
      body.description = params.description;
    }

    if (params.image) {
      body.image = params.image;
      // Add medias array for proper image handling
      body.medias = [
        {
          id: crypto.randomUUID(),
          title: params.name,
          url: params.image,
          type: 'image',
          isFeatured: true,
        },
      ];
    }

    console.log('Creating product:', JSON.stringify(body, null, 2));

    const response = await fetch(`${GHL_API_V2_BASE}/products/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Version': GHL_API_VERSION,
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log('Create product response:', response.status, responseText);

    if (!response.ok) {
      console.error('GHL create product error:', response.status, responseText);
      return { success: false, error: `API error: ${response.status} - ${responseText}` };
    }

    const data = JSON.parse(responseText);
    return { success: true, product: data.product || data };
  } catch (error) {
    console.error('Failed to create GHL product:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * List all products from GoHighLevel
 */
export async function listProducts(locationId: string): Promise<GHLProduct[]> {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    console.warn('GHL_API_KEY not configured');
    return [];
  }

  try {
    const response = await fetch(`${GHL_API_V2_BASE}/products/?locationId=${locationId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': GHL_API_VERSION,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL list products error:', response.status, errorText);
      return [];
    }

    const data = await response.json();
    console.log('List products sample:', JSON.stringify(data.products?.[0], null, 2)?.substring(0, 800));
    return data.products || [];
  } catch (error) {
    console.error('Failed to list GHL products:', error);
    return [];
  }
}

/**
 * Add a price to a product
 */
export async function addPriceToProduct(
  productId: string,
  locationId: string,
  priceInCents: number
): Promise<UpdateProductResult> {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'GHL_API_KEY not configured' };
  }

  try {
    const priceInDollars = priceInCents / 100;
    const body = {
      product: productId,
      locationId: locationId,
      name: 'Default Price',
      type: 'one_time',
      amount: priceInDollars,
      currency: 'USD',
      isDigitalProduct: true, // Mark as digital product price
    };

    console.log(`Adding price $${priceInDollars} to product ${productId}`, JSON.stringify(body));

    const response = await fetch(`${GHL_API_V2_BASE}/products/${productId}/price`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Version': GHL_API_VERSION,
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log('Add price response:', response.status, responseText.substring(0, 200));

    if (!response.ok) {
      return { success: false, error: `API error: ${response.status} - ${responseText}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Add price exception:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Update product type to DIGITAL
 */
export async function updateProductType(
  productId: string,
  locationId: string,
  productName: string
): Promise<UpdateProductResult> {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'GHL_API_KEY not configured' };
  }

  try {
    // Try PATCH with just productType field
    const body = {
      productType: 'DIGITAL',
    };

    console.log('Updating product type to DIGITAL via PATCH:', productId);

    const response = await fetch(`${GHL_API_V2_BASE}/products/${productId}?locationId=${locationId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Version': GHL_API_VERSION,
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log('Update product type response:', response.status, responseText.substring(0, 300));

    // If PATCH doesn't work, try PUT with full body
    if (!response.ok) {
      console.log('PATCH failed, trying PUT with full body...');
      const putBody = {
        locationId,
        name: productName,
        productType: 'DIGITAL',
      };

      const putResponse = await fetch(`${GHL_API_V2_BASE}/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Version': GHL_API_VERSION,
        },
        body: JSON.stringify(putBody),
      });

      const putResponseText = await putResponse.text();
      console.log('PUT product type response:', putResponse.status, putResponseText.substring(0, 300));

      if (!putResponse.ok) {
        return { success: false, error: `API error: ${putResponse.status}` };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Update product type exception:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Delete a product from GoHighLevel
 */
export async function deleteProduct(productId: string, locationId: string): Promise<UpdateProductResult> {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'GHL_API_KEY not configured' };
  }

  try {
    const url = `${GHL_API_V2_BASE}/products/${productId}?locationId=${locationId}`;
    console.log('Deleting product:', url);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': GHL_API_VERSION,
      },
    });

    const responseText = await response.text();
    console.log('Delete response:', response.status, responseText);

    if (!response.ok) {
      return { success: false, error: `API error: ${response.status} - ${responseText}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete product exception:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Delete all course-related products from GHL and recreate them
 */
export async function deleteAndRecreateProducts(courses: CourseToSync[]): Promise<SyncResult[]> {
  const locationId = process.env.GHL_LOCATION_ID;

  if (!locationId) {
    return courses.map((c) => ({
      courseId: c.id,
      courseTitle: c.title,
      success: false,
      error: 'GHL_LOCATION_ID not configured',
    }));
  }

  // Get existing products
  const existingProducts = await listProducts(locationId);

  // Create a map of product name (lowercase) to ALL matching products (handle duplicates)
  const productMap = new Map<string, GHLProduct[]>();
  for (const product of existingProducts) {
    const key = product.name.toLowerCase();
    if (!productMap.has(key)) {
      productMap.set(key, []);
    }
    productMap.get(key)!.push(product);
  }

  const results: SyncResult[] = [];

  for (const course of courses) {
    const existingProductsList = productMap.get(course.title.toLowerCase()) || [];

    // Delete ALL existing products with this name (including duplicates)
    for (const existingProduct of existingProductsList) {
      console.log(`Deleting product: ${existingProduct.name} (${existingProduct._id})`);
      const deleteResult = await deleteProduct(existingProduct._id, locationId);
      if (!deleteResult.success) {
        console.log(`  Failed to delete: ${deleteResult.error}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Create new product
    const createResult = await createProduct({
      name: course.title,
      description: course.shortDesc || course.description || undefined,
      image: course.thumbnail || undefined,
      price: course.price || undefined,
      locationId,
    });

    let finalSuccess = createResult.success;
    let finalError = createResult.error;

    // If create succeeded, add price and update type
    if (createResult.success && createResult.product?._id) {
      const productId = createResult.product._id;

      // Add price
      if (course.price && course.price > 0) {
        const priceResult = await addPriceToProduct(productId, locationId, course.price);
        if (!priceResult.success) {
          console.log(`Failed to add price: ${priceResult.error}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      // Update product type to DIGITAL
      const typeResult = await updateProductType(productId, locationId, course.title);
      if (!typeResult.success) {
        console.log(`Failed to update product type: ${typeResult.error}`);
      }
    }

    results.push({
      courseId: course.id,
      courseTitle: course.title,
      success: finalSuccess,
      ghlProductId: createResult.product?._id,
      error: finalError,
    });

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return results;
}

/**
 * Get prices for a product from GoHighLevel
 */
export async function getProductPrices(productId: string): Promise<GHLProductPrice[]> {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey) {
    return [];
  }

  try {
    const url = `${GHL_API_V2_BASE}/products/${productId}/price?locationId=${locationId}`;
    console.log('Fetching prices:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': GHL_API_VERSION,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Get prices error:', response.status, errorText);
      return [];
    }

    const data = await response.json();
    console.log('Prices response:', JSON.stringify(data, null, 2));
    return data.prices || data || [];
  } catch (error) {
    console.error('Failed to get product prices:', error);
    return [];
  }
}

/**
 * Delete a price from a product
 */
export async function deleteProductPrice(
  productId: string,
  priceId: string
): Promise<UpdateProductResult> {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'GHL_API_KEY not configured' };
  }

  try {
    console.log(`Deleting price ${priceId} from product ${productId}`);
    const response = await fetch(`${GHL_API_V2_BASE}/products/${productId}/price/${priceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': GHL_API_VERSION,
      },
    });

    const responseText = await response.text();
    console.log(`Delete response: ${response.status} - ${responseText}`);

    if (!response.ok) {
      return { success: false, error: `Delete error: ${response.status} - ${responseText}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete price exception:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Update a specific price by ID
 */
export async function updatePriceById(
  productId: string,
  priceId: string,
  newAmount: number
): Promise<UpdateProductResult> {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'GHL_API_KEY not configured' };
  }

  try {
    const response = await fetch(`${GHL_API_V2_BASE}/products/${productId}/price/${priceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Version': GHL_API_VERSION,
      },
      body: JSON.stringify({
        amount: newAmount,
        name: 'Default Price',
        type: 'one_time',
        currency: 'USD',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL update price error:', response.status, errorText);
      return { success: false, error: `API error: ${response.status} - ${errorText}` };
    }

    return { success: true };
  } catch (error) {
    console.error('GHL update price exception:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Update prices for all GHL products to match course prices
 * Matches products to courses by name
 */
export async function updateGHLProductPrices(courses: CourseToSync[]): Promise<SyncResult[]> {
  const locationId = process.env.GHL_LOCATION_ID;

  if (!locationId) {
    return courses.map((c) => ({
      courseId: c.id,
      courseTitle: c.title,
      success: false,
      error: 'GHL_LOCATION_ID not configured',
    }));
  }

  // Get existing products
  const existingProducts = await listProducts(locationId);

  // Create a map of product name (lowercase) to product
  const productMap = new Map<string, GHLProduct>();
  for (const product of existingProducts) {
    productMap.set(product.name.toLowerCase(), product);
  }

  const results: SyncResult[] = [];

  for (const course of courses) {
    const ghlProductBasic = productMap.get(course.title.toLowerCase());

    if (!ghlProductBasic) {
      results.push({
        courseId: course.id,
        courseTitle: course.title,
        success: false,
        skipped: true,
        skipReason: 'Product not found in GHL',
      });
      continue;
    }

    // Get prices for this product
    const prices = await getProductPrices(ghlProductBasic._id);

    // Convert course price from cents to dollars
    const correctPriceInDollars = (course.price || 0) / 100;
    const wrongPriceInDollars = course.price || 0; // This is what we mistakenly sent (cents as dollars)

    console.log(`Product "${ghlProductBasic.name}" - correct: $${correctPriceInDollars}, wrong: $${wrongPriceInDollars}`);
    console.log(`  Prices:`, prices.map(p => `$${p.amount} (id: ${p._id})`).join(', '));

    if (prices.length === 0) {
      results.push({
        courseId: course.id,
        courseTitle: course.title,
        success: false,
        error: 'No prices found on product',
        ghlProductId: ghlProductBasic._id,
      });
      continue;
    }

    let success = true;
    let errorMsg = '';

    // Find and delete the wrong price (the one that's ~100x too high)
    for (const price of prices) {
      const priceId = price._id;
      const priceAmount = price.amount;

      // If this price matches the wrong amount (cents sent as dollars), delete it
      if (priceId && priceAmount && Math.abs(priceAmount - wrongPriceInDollars) < 1) {
        console.log(`  Deleting wrong price: $${priceAmount}`);
        const deleteResult = await deleteProductPrice(ghlProductBasic._id, priceId);
        if (!deleteResult.success) {
          console.log(`  Failed to delete: ${deleteResult.error}`);
          errorMsg = deleteResult.error || '';
        }
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }

    // Check if there's a correct price, if not we need to update one
    const hasCorrectPrice = prices.some(p => Math.abs((p.amount || 0) - correctPriceInDollars) < 0.01);

    if (!hasCorrectPrice && prices.length > 0) {
      // Update the first remaining price to the correct amount
      const firstPriceId = prices[0]._id;
      if (firstPriceId) {
        const updateResult = await updatePriceById(ghlProductBasic._id, firstPriceId, correctPriceInDollars);
        if (!updateResult.success) {
          success = false;
          errorMsg = updateResult.error || '';
        }
      }
    }

    results.push({
      courseId: course.id,
      courseTitle: course.title,
      success,
      ghlProductId: ghlProductBasic._id,
      error: errorMsg || undefined,
    });

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return results;
}

/**
 * Sync a course to GHL as a product
 */
export interface CourseToSync {
  id: string;
  title: string;
  description?: string | null;
  shortDesc?: string | null;
  thumbnail?: string | null;
  price?: number | null; // in cents
  slug: string;
}

export interface SyncResult {
  courseId: string;
  courseTitle: string;
  success: boolean;
  ghlProductId?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Sync multiple courses to GHL products
 * Returns results for each course
 */
export async function syncCoursesToGHL(courses: CourseToSync[]): Promise<SyncResult[]> {
  const locationId = process.env.GHL_LOCATION_ID;

  if (!locationId) {
    return courses.map((c) => ({
      courseId: c.id,
      courseTitle: c.title,
      success: false,
      error: 'GHL_LOCATION_ID not configured',
    }));
  }

  // Get existing products to avoid duplicates
  const existingProducts = await listProducts(locationId);
  const existingNames = new Set(existingProducts.map((p) => p.name.toLowerCase()));

  const results: SyncResult[] = [];

  for (const course of courses) {
    // Check if product already exists (by name)
    if (existingNames.has(course.title.toLowerCase())) {
      results.push({
        courseId: course.id,
        courseTitle: course.title,
        success: true,
        skipped: true,
        skipReason: 'Product already exists in GHL',
      });
      continue;
    }

    const result = await createProduct({
      name: course.title,
      description: course.shortDesc || course.description || undefined,
      image: course.thumbnail || undefined,
      price: course.price || undefined,
      locationId,
    });

    results.push({
      courseId: course.id,
      courseTitle: course.title,
      success: result.success,
      ghlProductId: result.product?._id,
      error: result.error,
    });

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return results;
}

/**
 * Sync a single course to GHL and create/update the product mapping
 * Used for automatic sync when courses are created or updated
 */
export async function syncSingleCourseToGHL(
  course: CourseToSync,
  prisma: any // Pass prisma client to avoid circular imports
): Promise<SyncResult> {
  const locationId = process.env.GHL_LOCATION_ID;

  if (!locationId) {
    return {
      courseId: course.id,
      courseTitle: course.title,
      success: false,
      error: 'GHL_LOCATION_ID not configured',
    };
  }

  try {
    // Check if product already exists in GHL (by name)
    const existingProducts = await listProducts(locationId);
    const existingProduct = existingProducts.find(
      (p) => p.name.toLowerCase() === course.title.toLowerCase()
    );

    let ghlProductId: string | undefined;

    if (existingProduct) {
      // Product exists - update it
      ghlProductId = existingProduct._id;
      console.log(`Updating existing GHL product: ${course.title} (${ghlProductId})`);

      // Update product details
      await updateProductType(ghlProductId, locationId, course.title);
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Update price if needed
      const prices = await getProductPrices(ghlProductId);
      const correctPriceInDollars = (course.price || 0) / 100;

      if (prices.length > 0) {
        const currentPrice = prices[0];
        if (currentPrice._id && Math.abs((currentPrice.amount || 0) - correctPriceInDollars) > 0.01) {
          await updatePriceById(ghlProductId, currentPrice._id, correctPriceInDollars);
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      } else if (course.price && course.price > 0) {
        // No prices exist, add one
        await addPriceToProduct(ghlProductId, locationId, course.price);
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    } else {
      // Create new product
      console.log(`Creating new GHL product: ${course.title}`);

      const createResult = await createProduct({
        name: course.title,
        description: course.shortDesc || course.description || undefined,
        image: course.thumbnail || undefined,
        price: course.price || undefined,
        locationId,
      });

      if (!createResult.success) {
        return {
          courseId: course.id,
          courseTitle: course.title,
          success: false,
          error: createResult.error,
        };
      }

      ghlProductId = createResult.product?._id;

      // Add price if we have one (with delay for GHL to process)
      if (ghlProductId && course.price && course.price > 0) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        await addPriceToProduct(ghlProductId, locationId, course.price);
      }

      // Update product type to ensure it's DIGITAL (with delay)
      if (ghlProductId) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        await updateProductType(ghlProductId, locationId, course.title);
      }
    }

    // Create or update ProductMapping in database
    if (ghlProductId) {
      const existingMapping = await prisma.productMapping.findFirst({
        where: { courseId: course.id },
      });

      if (existingMapping) {
        // Update existing mapping
        await prisma.productMapping.update({
          where: { id: existingMapping.id },
          data: {
            ghlProductId,
            ghlProductName: course.title,
          },
        });
        console.log(`Updated ProductMapping for ${course.title}`);
      } else {
        // Create new mapping
        await prisma.productMapping.create({
          data: {
            ghlProductId,
            ghlProductName: course.title,
            courseId: course.id,
            active: true,
          },
        });
        console.log(`Created ProductMapping for ${course.title}`);
      }
    }

    return {
      courseId: course.id,
      courseTitle: course.title,
      success: true,
      ghlProductId,
    };
  } catch (error) {
    console.error(`Error syncing course ${course.title} to GHL:`, error);
    return {
      courseId: course.id,
      courseTitle: course.title,
      success: false,
      error: String(error),
    };
  }
}

/**
 * Delete a course's product from GHL
 * Used when a course is deleted
 */
export async function deleteGHLProductForCourse(
  courseId: string,
  prisma: any,
  courseTitle?: string
): Promise<{ success: boolean; error?: string }> {
  const locationId = process.env.GHL_LOCATION_ID;

  if (!locationId) {
    return { success: false, error: 'GHL_LOCATION_ID not configured' };
  }

  try {
    // Find the product mapping
    const mapping = await prisma.productMapping.findFirst({
      where: { courseId },
    });

    let ghlProductId: string | undefined;

    if (mapping) {
      ghlProductId = mapping.ghlProductId;
    } else if (courseTitle) {
      // No mapping exists - try to find product by name in GHL
      console.log(`No ProductMapping found, searching GHL by name: ${courseTitle}`);
      const existingProducts = await listProducts(locationId);
      const matchingProduct = existingProducts.find(
        (p) => p.name.toLowerCase() === courseTitle.toLowerCase()
      );
      if (matchingProduct) {
        ghlProductId = matchingProduct._id;
        console.log(`Found GHL product by name: ${ghlProductId}`);
      }
    }

    if (!ghlProductId) {
      console.log(`No GHL product found for course ${courseId}`);
      return { success: true }; // No product to delete
    }

    // Delete from GHL
    console.log(`Deleting GHL product: ${ghlProductId}`);
    const deleteResult = await deleteProduct(ghlProductId, locationId);

    if (deleteResult.success) {
      // Remove the mapping if it exists
      if (mapping) {
        await prisma.productMapping.delete({
          where: { id: mapping.id },
        });
      }
      console.log(`Deleted GHL product for course ${courseId}`);
    } else {
      console.error(`Failed to delete GHL product: ${deleteResult.error}`);
    }

    return deleteResult;
  } catch (error) {
    console.error(`Error deleting GHL product for course ${courseId}:`, error);
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// Conversation history (admin viewer)
// ============================================================================
// Read-only helpers used by /api/admin/ghl/conversations to surface a
// contact's full SMS + email thread in the admin panel. Ported from
// mastermind-stripe-dashboard/lib/ghl.ts. Uses GHL v2 (leadconnectorhq.com).

interface GHLConversation {
  id: string;
  contactId: string;
  locationId: string;
  lastMessageBody: string;
  lastMessageDate: string;
  type: string;
  unreadCount: number;
}

export interface GHLMessage {
  id: string;
  conversationId: string;
  contactId: string;
  body: string;
  type: number; // 1 = SMS, 3 = Email, 28 = Activity, etc.
  direction: 'inbound' | 'outbound';
  status: string;
  dateAdded: string;
  attachments?: string[];
  userId?: string;
  messageType?: string;
  meta?: {
    email?: {
      subject?: string;
      messageType?: string;
    };
  };
}

export interface GHLContactDetail {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: string;
  tags?: string[];
}

interface GHLSearchConversationsResponse {
  conversations: GHLConversation[];
  total?: number;
}
interface GHLMessagesResponse {
  messages: GHLMessage[] | { messages?: GHLMessage[]; nextPage?: string };
  nextPage?: string;
}
interface GHLSearchContactsResponse {
  contacts: GHLContactDetail[];
  total?: number;
}

async function ghlV2Fetch<T>(endpoint: string): Promise<T> {
  const apiKey = process.env.GHL_API_KEY?.trim();
  if (!apiKey) throw new Error('GHL_API_KEY is not configured');

  const res = await fetch(`${GHL_API_V2_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Version: GHL_API_VERSION,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GHL ${endpoint} → ${res.status} ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON from GHL ${endpoint}`);
  }
}

/** Fetch a contact by GHL contact ID (v2). */
export async function getGhlContactById(contactId: string): Promise<GHLContactDetail | null> {
  try {
    const json = await ghlV2Fetch<{ contact: GHLContactDetail }>(`/contacts/${contactId}`);
    return json.contact || null;
  } catch (err) {
    console.error('[GHL] getGhlContactById failed', err);
    return null;
  }
}

/** Search for a GHL contact by email. Used as a fallback when User
 *  has no `ghlContactId` set yet but we know their email. */
export async function searchGhlContactByEmail(email: string): Promise<GHLContactDetail | null> {
  const locationId = process.env.GHL_LOCATION_ID?.trim();
  if (!locationId) throw new Error('GHL_LOCATION_ID is not configured');
  try {
    const params = new URLSearchParams({ locationId, query: email });
    const json = await ghlV2Fetch<GHLSearchContactsResponse>(
      `/contacts/?${params.toString()}`
    );
    if (!Array.isArray(json.contacts)) return null;
    const exact = json.contacts.find(
      (c) => c?.email?.toLowerCase() === email.toLowerCase()
    );
    return exact ?? json.contacts[0] ?? null;
  } catch (err) {
    console.error('[GHL] searchGhlContactByEmail failed', err);
    return null;
  }
}

/** List all conversations for a GHL contact. */
export async function getConversationsForContact(
  contactId: string
): Promise<GHLConversation[]> {
  const locationId = process.env.GHL_LOCATION_ID?.trim();
  if (!locationId) throw new Error('GHL_LOCATION_ID is not configured');
  try {
    const params = new URLSearchParams({ locationId, contactId });
    const json = await ghlV2Fetch<GHLSearchConversationsResponse>(
      `/conversations/search?${params.toString()}`
    );
    return Array.isArray(json.conversations) ? json.conversations : [];
  } catch (err) {
    console.error('[GHL] getConversationsForContact failed', err);
    return [];
  }
}

/** Pull messages for a conversation. GHL returns either a flat
 *  `{messages:[...]}` shape or a nested `{messages:{messages:[...]}}` shape
 *  depending on the conversation type — we handle both. */
export async function getMessagesFromConversation(
  conversationId: string,
  limit: number = 50
): Promise<GHLMessage[]> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    const json = await ghlV2Fetch<GHLMessagesResponse>(
      `/conversations/${conversationId}/messages?${params.toString()}`
    );
    if (Array.isArray(json.messages)) return json.messages;
    if (json.messages && typeof json.messages === 'object') {
      const nested = json.messages as { messages?: GHLMessage[] };
      if (Array.isArray(nested.messages)) return nested.messages;
    }
    return [];
  } catch (err) {
    console.error('[GHL] getMessagesFromConversation failed', err);
    return [];
  }
}

/** End-to-end: contact → conversations → messages, sorted oldest-to-newest
 *  so the admin viewer can render in chat order. Returns an empty array
 *  rather than throwing when the contact has no conversations. */
export async function getConversationHistoryByContactId(contactId: string): Promise<{
  contact: GHLContactDetail | null;
  messages: GHLMessage[];
  error?: string;
}> {
  try {
    const contact = await getGhlContactById(contactId);
    if (!contact) {
      return { contact: null, messages: [], error: 'Contact not found in GHL' };
    }
    const conversations = await getConversationsForContact(contact.id);
    if (conversations.length === 0) {
      return { contact, messages: [] };
    }
    const all: GHLMessage[] = [];
    for (const conv of conversations) {
      const msgs = await getMessagesFromConversation(conv.id);
      for (const m of msgs) all.push(m);
    }
    // Oldest → newest so the viewer renders chat-style with the latest
    // message at the bottom (mirrors mastermind's UX).
    all.sort(
      (a, b) =>
        new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime()
    );
    return { contact, messages: all };
  } catch (err) {
    return {
      contact: null,
      messages: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
