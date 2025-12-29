import { getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { sql } from 'drizzle-orm';

export class StripeService {
  async createConnectAccount(businessId: string, email: string, businessName: string) {
    const stripe = await getUncachableStripeClient();
    
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      business_type: 'individual',
      metadata: { businessId },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: businessName,
      },
    });

    return account;
  }

  async createAccountLink(accountId: string, returnUrl: string, refreshUrl: string) {
    const stripe = await getUncachableStripeClient();
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return accountLink;
  }

  async getAccount(accountId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.accounts.retrieve(accountId);
  }

  async createLoginLink(accountId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.accounts.createLoginLink(accountId);
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    connectedAccountId: string,
    metadata: Record<string, string> = {}
  ) {
    const stripe = await getUncachableStripeClient();
    
    const applicationFeeAmount = Math.round(amount * 0.05);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: connectedAccountId,
      },
      metadata,
    });

    return paymentIntent;
  }

  async createCheckoutSession(
    amount: number,
    currency: string,
    connectedAccountId: string,
    successUrl: string,
    cancelUrl: string,
    metadata: Record<string, string> = {}
  ) {
    const stripe = await getUncachableStripeClient();
    
    const applicationFeeAmount = Math.round(amount * 0.05);
    
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: metadata.serviceName || 'Service',
              description: metadata.serviceDescription || undefined,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: connectedAccountId,
        },
        metadata,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    });

    return session;
  }

  async createQuickSaleSession(
    amount: number,
    currency: string,
    connectedAccountId: string,
    description: string,
    successUrl: string,
    cancelUrl: string,
    businessId: string
  ) {
    const stripe = await getUncachableStripeClient();
    
    const applicationFeeAmount = Math.round(amount * 0.05);
    
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: description || 'Quick Sale',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: connectedAccountId,
        },
        metadata: {
          type: 'quick_sale',
          businessId,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        type: 'quick_sale',
        businessId,
      },
    });

    return session;
  }

  async getPaymentIntent(paymentIntentId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async getBalance(connectedAccountId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.balance.retrieve({
      stripeAccount: connectedAccountId,
    });
  }

  async listPayouts(connectedAccountId: string, limit = 10) {
    const stripe = await getUncachableStripeClient();
    return await stripe.payouts.list(
      { limit },
      { stripeAccount: connectedAccountId }
    );
  }

  async listCharges(connectedAccountId: string, limit = 10) {
    const stripe = await getUncachableStripeClient();
    return await stripe.charges.list(
      { limit },
      { stripeAccount: connectedAccountId }
    );
  }
}

export const stripeService = new StripeService();
