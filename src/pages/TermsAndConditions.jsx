import React from 'react'

const TermsAndConditions = () => {
  return (
    <div className='max-w-4xl mx-auto py-10 sm:py-14'>
      <h1 className='text-2xl sm:text-3xl font-semibold mb-4'>Terms and Conditions</h1>
      <p className='text-sm text-gray-500 mb-8'>Last updated: April 1, 2026</p>

      <div className='space-y-6 text-gray-800 leading-7'>
        <section>
          <h2 className='text-lg font-semibold mb-2'>1. Acceptance of Terms</h2>
          <p>
            By creating an account or using ARTISTRY, you agree to these Terms and Conditions.
            If you do not agree, please do not use the platform.
          </p>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-2'>2. Accounts and Security</h2>
          <p>
            You are responsible for maintaining the confidentiality of your login credentials and for
            all activities that occur under your account.
          </p>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-2'>3. Marketplace Use</h2>
          <p>
            Customers and sellers must use the platform lawfully and respectfully. Fraudulent,
            misleading, abusive, or illegal activity is prohibited.
          </p>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-2'>4. Seller Responsibilities</h2>
          <p>
            Sellers are responsible for accurate product listings, pricing, shipping details,
            and fulfillment quality for all orders they accept.
          </p>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-2'>5. Payments, Returns, and Disputes</h2>
          <p>
            Transactions, return handling, and dispute outcomes are subject to platform policies,
            applicable law, and documented order records.
          </p>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-2'>6. Limitation of Liability</h2>
          <p>
            ARTISTRY provides the platform as-is and is not liable for indirect, incidental,
            or consequential damages arising from platform use to the extent permitted by law.
          </p>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-2'>7. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the platform after changes
            means you accept the revised terms.
          </p>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-2'>8. Contact</h2>
          <p>
            For questions about these terms, contact support through the Support page.
          </p>
        </section>
      </div>
    </div>
  )
}

export default TermsAndConditions
