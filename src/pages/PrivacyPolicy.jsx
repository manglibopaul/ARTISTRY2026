import React from 'react'

const PrivacyPolicy = () => {
  return (
    <div className='max-w-4xl mx-auto py-10 sm:py-14'>
      <h1 className='text-2xl sm:text-3xl font-semibold mb-4'>Privacy Policy</h1>
      <p className='text-sm text-gray-500 mb-8'>Last updated: April 1, 2026</p>

      <div className='space-y-6 text-gray-800 leading-7'>
        <section>
          <h2 className='text-lg font-semibold mb-2'>1. Information We Collect</h2>
          <p>
            We collect account details, profile information, order data, and technical usage data
            required to operate the platform.
          </p>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-2'>2. How We Use Information</h2>
          <p>
            We use your information to provide services, process orders, support accounts,
            improve platform reliability, and communicate important updates.
          </p>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-2'>3. Sharing of Information</h2>
          <p>
            We may share necessary data with sellers, customers, payment providers, and service
            providers only as required to complete transactions and operate the platform.
          </p>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-2'>4. Data Retention</h2>
          <p>
            We retain data for as long as needed for legal, security, accounting, and operational
            purposes, then securely delete or anonymize it where possible.
          </p>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-2'>5. Security</h2>
          <p>
            We use reasonable technical and organizational safeguards to protect your information,
            but no system can guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-2'>6. Your Choices</h2>
          <p>
            You may update profile information, request account-related assistance, and contact us
            for privacy-related concerns using platform support channels.
          </p>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-2'>7. Updates to This Policy</h2>
          <p>
            We may update this policy from time to time. Continued use of the platform after changes
            means you acknowledge the updated policy.
          </p>
        </section>
      </div>
    </div>
  )
}

export default PrivacyPolicy
