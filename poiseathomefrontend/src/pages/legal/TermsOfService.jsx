import React from 'react';
import LegalPage from '../../components/LegalPage';

const sections = [
  { heading: '1. Using PoiseAtHome', paragraphs: ['PoiseAtHome lets customers browse salon services, request home appointments, submit payment information, and manage bookings. You must provide accurate information and use the service only for lawful personal purposes.'] },
  { heading: '2. Accounts', paragraphs: ['You are responsible for keeping your login details secure and for activity performed through your account. Tell Poise Hair Center Salon promptly if you believe your account has been accessed without permission.'] },
  { heading: '3. Appointments and availability', paragraphs: ['Appointment requests depend on stylist availability, service area, preparation requirements, and confirmation by the salon. Displayed durations are estimates and may vary based on the selected service and customer needs.'] },
  { heading: '4. Prices and payments', paragraphs: ['Current prices and any required down payment are shown during booking. A booking is not fully confirmed until the required payment has been reviewed and accepted. Customers are responsible for submitting accurate payment details and proof.'] },
  { heading: '5. Changes and cancellations', paragraphs: ['Contact the salon as soon as possible when you need to change or cancel an appointment. Refunds, rescheduling, late arrivals, and missed appointments are handled according to the policy communicated with your booking confirmation.'] },
  { heading: '6. Home-service safety', paragraphs: ['Customers must provide a safe, accessible, and suitable location for the appointment. The salon may decline or stop a service when conditions are unsafe, inappropriate, or materially different from the booking details.'] },
  { heading: '7. Service results', paragraphs: ['Hair services and results vary based on hair condition, history, maintenance, and other individual factors. Tell your stylist about allergies, sensitivities, prior chemical treatments, and relevant conditions before service begins.'] },
  { heading: '8. Acceptable use', items: ['Do not misuse the platform, attempt unauthorized access, or interfere with its operation.', 'Do not submit false bookings, fraudulent payment records, harmful files, or another person’s information without permission.', 'Treat salon staff respectfully and do not use the service for harassment or unlawful conduct.'] },
  { heading: '9. Platform availability', paragraphs: ['We may maintain, change, suspend, or discontinue parts of the platform when reasonably necessary. We aim to keep booking information accurate but cannot promise uninterrupted or error-free access.'] },
  { heading: '10. Contact and updates', paragraphs: ['Questions about these terms may be directed to Poise Hair Center Salon through its official contact channels. We may update these terms as services or requirements change; the latest version and update date will remain available on this page.'] },
];

const TermsOfService = () => <LegalPage title="Terms of Service" introduction="These terms explain the rules for using PoiseAtHome and booking Poise Hair Center Salon home services." sections={sections} />;

export default TermsOfService;
