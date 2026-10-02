import React from 'react';
import LegalPage from '../../components/LegalPage';

const sections = [
  { heading: '1. Information we collect', items: ['Account information such as your name, email address, contact number, and encrypted password.', 'Service addresses, appointment selections, scheduling details, notes, and booking history.', 'Payment method details, references, and proof of payment that you submit.', 'Technical and security information needed to operate, protect, and troubleshoot the platform.'] },
  { heading: '2. How we use information', items: ['Create and secure your account and verify your email address.', 'Arrange home-service appointments and communicate booking updates.', 'Assign appropriate staff, review payments, support customers, and maintain service records.', 'Prevent misuse, comply with applicable obligations, and improve platform reliability.'] },
  { heading: '3. When information is shared', paragraphs: ['Booking information is available only to authorized salon administrators and staff who need it to provide or manage your service. We may also use service providers for hosting, object storage, email delivery, and other essential operations. We do not sell your personal information.'] },
  { heading: '4. Images and payment proofs', paragraphs: ['Public service and staff images may be stored in the platform’s image storage. Customer payment proofs are treated as private records and are accessible only to authorized personnel for payment review and support.'] },
  { heading: '5. Retention and security', paragraphs: ['We retain information for as long as reasonably needed to provide services, maintain business records, resolve concerns, and meet applicable requirements. We use access controls and other reasonable safeguards, but no online system can guarantee absolute security.'] },
  { heading: '6. Your choices', paragraphs: ['You may review and update available account and address details from your dashboard. You may also contact the salon to request help correcting information or to ask about access, deletion, or other privacy choices, subject to records we are required or reasonably need to retain.'] },
  { heading: '7. Cookies and sessions', paragraphs: ['PoiseAtHome uses essential browser storage and session technologies to keep you signed in, protect requests, and remember necessary application state. These are used to operate the platform rather than for third-party advertising.'] },
  { heading: '8. Children’s privacy', paragraphs: ['The platform is intended for people who can legally create an account and book services. A parent or legal guardian should arrange services for a minor and provide any necessary consent.'] },
  { heading: '9. Policy changes and contact', paragraphs: ['We may update this policy when our services or practices change. The latest version and update date will remain on this page. Privacy questions or requests may be sent to Poise Hair Center Salon through its official contact channels.'] },
];

const PrivacyPolicy = () => <LegalPage title="Privacy Policy" introduction="This policy explains what information PoiseAtHome handles, why it is needed, and the choices available to customers." sections={sections} />;

export default PrivacyPolicy;
