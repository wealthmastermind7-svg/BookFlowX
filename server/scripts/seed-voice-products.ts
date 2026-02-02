import { getUncachableStripeClient } from '../stripeClient';

const VOICE_PRODUCTS = [
  {
    name: 'Voice Agent - Starter',
    description: 'Perfect for small businesses. 60 minutes of voice booking per month.',
    metadata: {
      tier: 'starter',
      minutes_limit: '60',
      features: 'voice_booking,email_confirmation,basic_analytics',
    },
    price: 4900, // $49.00
  },
  {
    name: 'Voice Agent - Pro',
    description: 'For growing businesses. 200 minutes of voice booking per month.',
    metadata: {
      tier: 'pro',
      minutes_limit: '200',
      features: 'voice_booking,email_confirmation,advanced_analytics,priority_support',
    },
    price: 14900, // $149.00
  },
  {
    name: 'Voice Agent - Business',
    description: 'For high-volume businesses. 500 minutes of voice booking per month.',
    metadata: {
      tier: 'business',
      minutes_limit: '500',
      features: 'voice_booking,email_confirmation,advanced_analytics,priority_support,custom_voice,api_access',
    },
    price: 34900, // $349.00
  },
];

async function seedVoiceProducts() {
  console.log('🎤 Seeding Voice Agent products...');
  
  const stripe = await getUncachableStripeClient();

  for (const product of VOICE_PRODUCTS) {
    // Check if product already exists
    const existing = await stripe.products.search({
      query: `name:'${product.name}'`,
    });

    if (existing.data.length > 0) {
      console.log(`✓ ${product.name} already exists (${existing.data[0].id})`);
      continue;
    }

    // Create the product
    const stripeProduct = await stripe.products.create({
      name: product.name,
      description: product.description,
      metadata: product.metadata,
    });
    console.log(`Created product: ${stripeProduct.id}`);

    // Create the monthly price
    const price = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: product.price,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: {
        tier: product.metadata.tier,
      },
    });
    console.log(`Created price: ${price.id} ($${product.price / 100}/month)`);
  }

  console.log('\n✅ Voice Agent products seeded successfully!');
  console.log('\nProducts created:');
  console.log('- Starter: $49/month (60 min)');
  console.log('- Pro: $149/month (200 min)');
  console.log('- Business: $349/month (500 min)');
}

// Run if called directly
seedVoiceProducts().catch(console.error);
