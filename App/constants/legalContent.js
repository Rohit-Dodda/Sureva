// Source of truth for the Privacy Policy and Terms of Service shown in-app.
// Structure: each document is an ordered list of blocks. Block kinds:
//   { kind: 'h', text }        section heading
//   { kind: 'sub', text }      subsection heading
//   { kind: 'p', text }        paragraph
//   { kind: 'bullets', items } bulleted list
//   { kind: 'callout', text }  highlighted notice box
// Keep this in sync with the published legal PDF (Effective June 14, 2026).

export const LEGAL_EFFECTIVE_DATE = 'June 14, 2026';
export const LEGAL_LAST_UPDATED = 'June 14, 2026';

export const PRIVACY_POLICY = {
  title: 'Privacy Policy',
  intro:
    'This Privacy Policy describes how Sureva, Inc. ("Sureva," "we," "us," or "our") collects, uses, stores, shares, and protects information obtained from users ("you" or "User") of the Sureva mobile application (the "App"), the Sureva wearable UV monitoring device (the "Device"), and all associated services (collectively, the "Services"). This policy is designed to comply with the California Consumer Privacy Act (CCPA) as amended by the California Privacy Rights Act (CPRA) and 2026 CCPA Regulations, the General Data Protection Regulation (GDPR) for users in the European Economic Area, the FTC Health Breach Notification Rule (as amended effective July 29, 2024), the Children\'s Online Privacy Protection Act (COPPA), applicable U.S. state consumer privacy laws, and the FDA\'s General Wellness Policy for Low Risk Devices (January 2026).',
  blocks: [
    { kind: 'h', text: '1. About Sureva and This Policy' },
    {
      kind: 'p',
      text:
        'Sureva is a general wellness product designed to help users monitor UV exposure and manage sunscreen reapplication. The Device and App are intended for general wellness purposes only. Sureva does not provide medical advice, diagnosis, or treatment. The Services do not constitute a medical device under FDA regulations and are not intended to diagnose, treat, cure, mitigate, or prevent any disease or medical condition.',
    },
    { kind: 'p', text: 'This Privacy Policy applies to:' },
    {
      kind: 'bullets',
      items: [
        'All information collected through the Sureva App on any platform (iOS, Android)',
        'All data transmitted from the Sureva wearable Device to the App or our servers',
        'Information collected through our website, support channels, and communications',
        'Data collected during account registration, onboarding, and ongoing use',
      ],
    },
    {
      kind: 'p',
      text:
        'By using the Services, you acknowledge that you have read and understood this Privacy Policy. If you do not agree to the practices described herein, please do not use the Services.',
    },

    { kind: 'h', text: '2. Information We Collect' },
    { kind: 'sub', text: '2.1 Information You Provide Directly' },
    { kind: 'p', text: 'When you create an account or use the Services, you may provide:' },
    {
      kind: 'bullets',
      items: [
        'Account information: name, email address, password',
        'Profile information: date of birth/age, skin tone (Fitzpatrick scale), skin type (oily/dry/combination/normal), burn history',
        'Health-related inputs: photosensitizing medication status (yes/no toggle only, we do not collect medication names), skin condition status (yes/no toggle only, we do not collect specific diagnoses)',
        'Session parameters: SPF value of sunscreen used, water resistance rating, activity level',
        'Location-related input: environment type (auto-detected via location or manually selected by you)',
        'Communications: messages you send to our support team',
      ],
    },
    { kind: 'sub', text: '2.2 Information Collected Automatically from the Device' },
    {
      kind: 'p',
      text: 'When your Sureva Device is active and connected to the App, we collect sensor data including:',
    },
    {
      kind: 'bullets',
      items: [
        'UV index readings (ambient ultraviolet radiation level)',
        'Temperature readings',
        'Humidity readings',
        'Accelerometer-derived activity level classifications',
        'Device status data: battery level, Bluetooth connection status, firmware version',
        'Button interaction events: reapplication confirmations, session start and end events',
        'Session timestamps: session start time, end time, duration',
        'Protection percentage calculations derived from sensor inputs and your profile',
      ],
    },
    { kind: 'sub', text: '2.3 Location Information' },
    {
      kind: 'p',
      text:
        'The App requests access to your device\'s location services ("when in use" permission level only) for the purpose of automatically detecting your outdoor environment (e.g., beach, mountain, urban, park) to improve the accuracy of the sunscreen depletion algorithm. Specifically:',
    },
    {
      kind: 'bullets',
      items: [
        'We collect your approximate GPS coordinates at the time a session begins',
        'We use reverse geocoding to classify your environment category, we do not store your precise continuous location history',
        'Location data is processed locally on your device where technically feasible',
        'You may decline location permission at any time; the App will then present a manual environment selection option',
        'Location data, when transmitted to our servers, is used solely for environment classification and is not shared with third-party advertising networks or data brokers',
      ],
    },
    {
      kind: 'p',
      text:
        'Note: Under the FTC\'s Health Breach Notification Rule (2024 amendment), location data that can be used to make inferences about a person\'s health-related activities constitutes personally identifiable health information. We treat all location data collected in connection with the Services accordingly.',
    },
    { kind: 'sub', text: '2.4 Automatically Collected Technical Information' },
    {
      kind: 'bullets',
      items: [
        'Device identifiers (device type, operating system version, unique device ID)',
        'App version and configuration settings',
        'Crash reports and diagnostic data',
        'Usage analytics: features accessed, screens viewed, session frequency (collected in aggregated, de-identified form where possible)',
        'Bluetooth pairing identifiers (MAC address of your Sureva Device, stored locally)',
      ],
    },
    { kind: 'sub', text: '2.5 Inferred Data' },
    {
      kind: 'p',
      text:
        'We may derive inferences about your sun exposure habits, skin sensitivity patterns, and sunscreen reapplication behavior based on the data above. These inferences are used solely to personalize your protection recommendations and are not shared or sold.',
    },

    { kind: 'h', text: '3. How We Use Your Information' },
    { kind: 'p', text: 'We use the information we collect for the following purposes:' },
    { kind: 'sub', text: '3.1 Providing and Improving the Services' },
    {
      kind: 'bullets',
      items: [
        'Calculating real-time UV protection depletion estimates based on your profile, current environmental conditions, and sensor data',
        'Generating personalized reapplication alerts and session summaries',
        'Delivering push notifications related to your sun protection status',
        'Maintaining your session history and cumulative UV exposure records',
        'Personalizing the algorithm over time based on your behavioral patterns (the "personal learning layer")',
        'Maintaining and improving the accuracy of the protection algorithm',
      ],
    },
    { kind: 'sub', text: '3.2 Account and Service Management' },
    {
      kind: 'bullets',
      items: [
        'Creating and managing your user account',
        'Authenticating your identity when you log in',
        'Processing your requests, including account deletion and data export',
        'Sending transactional communications (account verification, password reset, service updates)',
      ],
    },
    { kind: 'sub', text: '3.3 Safety and Security' },
    {
      kind: 'bullets',
      items: [
        'Monitoring for and preventing unauthorized access, fraud, and abuse',
        'Detecting and resolving technical issues with the Device or App',
        'Complying with legal obligations including breach notification requirements',
      ],
    },
    { kind: 'sub', text: '3.4 Research and Product Development' },
    {
      kind: 'p',
      text:
        'We may use de-identified and aggregated data (which cannot reasonably identify you) to understand usage patterns, improve our algorithm\'s accuracy, and develop new features. This aggregated data does not constitute personal information and is not subject to the restrictions in this policy.',
    },
    { kind: 'sub', text: '3.5 Legal Compliance' },
    {
      kind: 'bullets',
      items: [
        'Complying with applicable laws and regulations',
        'Responding to valid legal process (subpoenas, court orders, regulatory inquiries)',
        'Enforcing our Terms of Service and protecting our legal rights',
      ],
    },
    { kind: 'sub', text: '3.6 AI-Generated Insights' },
    {
      kind: 'p',
      text:
        'Sureva uses (and may in the future expand its use of) third-party artificial intelligence and large language model technology, including services provided by Anthropic PBC, to generate personalized narrative summaries and wellness insights from your session and profile data ("AI-Generated Insights"). This is separate and distinct from the deterministic protection algorithm described elsewhere in this policy: AI-Generated Insights involve transmitting a limited set of your session data (such as protection percentages, UV exposure figures, and profile inputs you have provided) to the third-party AI provider for the sole purpose of generating this narrative text. That provider processes this data under its own confidentiality and data-processing terms and does not use it to train its models on your data or share it further. AI-Generated Insights are optional, best-effort, and are never required for core Services functionality — if unavailable, the App displays your session summary without the AI insight content. AI-Generated Insights are wellness commentary only and do not constitute medical advice.',
    },
    {
      kind: 'p',
      text:
        'We do not use your personal information for targeted advertising. We do not sell, rent, or trade your personal information, including your health-related data, to third parties for their own marketing purposes.',
    },

    { kind: 'h', text: '4. Legal Basis for Processing (GDPR, EEA Users)' },
    {
      kind: 'p',
      text:
        'If you are located in the European Economic Area, we process your personal data on the following legal bases:',
    },
    {
      kind: 'bullets',
      items: [
        'Performance of contract: processing necessary to provide the Services you requested (Article 6(1)(b) GDPR)',
        'Legitimate interests: processing necessary for our legitimate interest in improving the Services, detecting fraud, and ensuring security, where these interests are not overridden by your rights (Article 6(1)(f) GDPR)',
        'Legal obligation: processing necessary to comply with applicable law (Article 6(1)(c) GDPR)',
        'Consent: for any processing not covered by the above bases, we will obtain your explicit consent. You may withdraw consent at any time without affecting the lawfulness of prior processing (Article 6(1)(a) GDPR)',
        'Special category data: Health-related inputs (skin type, condition status, medication status) constitute special category data under Article 9 GDPR. We process this data on the basis of your explicit consent (Article 9(2)(a) GDPR). You may withdraw this consent at any time via the App settings or by contacting privacy@sureva.com',
      ],
    },

    { kind: 'h', text: '5. How We Share Your Information' },
    {
      kind: 'p',
      text:
        'We do not sell your personal information. We do not share your personal information with third-party advertisers. We share information only in the following limited circumstances:',
    },
    { kind: 'sub', text: '5.1 Service Providers' },
    {
      kind: 'p',
      text:
        'We share data with third-party vendors who help us operate the Services under strict contractual confidentiality and data processing agreements. These include:',
    },
    {
      kind: 'bullets',
      items: [
        'Cloud infrastructure providers (e.g., database hosting, server infrastructure)',
        'Authentication services',
        'Push notification delivery services',
        'Crash reporting and analytics providers (de-identified data only where possible)',
        'Customer support platforms',
      ],
    },
    {
      kind: 'p',
      text:
        'All service providers are prohibited from using your data for any purpose other than providing services to us and are required to maintain appropriate security measures.',
    },
    { kind: 'sub', text: '5.2 Family Account Features' },
    {
      kind: 'p',
      text:
        'If you use Family Mode and add additional Device users to your account, the account holder will have access to session data and protection status for all devices under the account. Each Device user\'s data is only shared with the primary account holder, not with other family members individually. You should not add a Device user to your account without their knowledge and consent.',
    },
    { kind: 'sub', text: '5.3 Clinician Sharing' },
    {
      kind: 'p',
      text:
        'If you choose to use our optional clinician data-sharing feature, you may export a PDF report of your UV exposure history to share with a healthcare provider. This sharing is entirely voluntary and initiated by you. We do not share your data with healthcare providers without your explicit instruction.',
    },
    { kind: 'sub', text: '5.4 Legal Requirements' },
    {
      kind: 'p',
      text:
        'We may disclose your information when required by law, regulation, or valid legal process, or when we believe in good faith that disclosure is necessary to protect the rights, property, or safety of Sureva, our users, or the public. We will notify you of such disclosure where legally permitted to do so.',
    },
    { kind: 'sub', text: '5.5 Business Transfers' },
    {
      kind: 'p',
      text:
        'If Sureva is involved in a merger, acquisition, asset sale, or bankruptcy, your information may be transferred as part of that transaction. We will notify you via email and/or prominent App notice before your information is transferred and becomes subject to a different privacy policy.',
    },
    { kind: 'sub', text: '5.6 With Your Consent' },
    { kind: 'p', text: 'We may share your information for any other purpose with your explicit consent.' },

    { kind: 'h', text: '6. Data Retention' },
    {
      kind: 'p',
      text:
        'We retain personal information for as long as necessary to provide the Services and fulfill the purposes described in this policy, subject to the following:',
    },
    {
      kind: 'bullets',
      items: [
        'Active account data: retained for the duration of your account',
        'Session history and UV exposure records: retained for 5 years from the date of collection, unless you request earlier deletion, to enable longitudinal health trend analysis',
        'Account information: deleted within 30 days of account deletion request, except where retention is required by law',
        'Crash reports and diagnostic data: retained for 12 months',
        'Backups: data may persist in encrypted backups for up to 90 days after deletion from primary systems',
        'Legal holds: data subject to litigation holds or regulatory requirements will be retained for the duration of such requirements',
      ],
    },
    { kind: 'p', text: 'You may request deletion of your data at any time as described in Section 8.' },

    { kind: 'h', text: '7. Data Security' },
    {
      kind: 'p',
      text:
        'We implement commercially reasonable technical and organizational security measures to protect your information from unauthorized access, disclosure, alteration, and destruction. These measures include:',
    },
    {
      kind: 'bullets',
      items: [
        'Encryption of data in transit using TLS 1.2 or higher',
        'Encryption of sensitive data at rest',
        'Access controls limiting employee access to personal data on a need-to-know basis',
        'Regular security assessments',
        'Secure software development practices',
      ],
    },
    {
      kind: 'p',
      text:
        'However, no security system is impenetrable. While we strive to protect your information, we cannot guarantee the absolute security of your data. You are responsible for maintaining the security of your account credentials and for notifying us immediately at support@sureva.com if you suspect unauthorized access to your account.',
    },
    { kind: 'sub', text: '7.1 Breach Notification' },
    {
      kind: 'p',
      text:
        'In the event of a security breach affecting your personally identifiable health information, we will notify you and, where required, the Federal Trade Commission, in accordance with the FTC Health Breach Notification Rule. Notice will be provided within 60 days of discovery of the breach by electronic notification (email, in-app message, and/or electronic banner), and by first-class mail if email contact information is unavailable. Notice to the FTC will be made in accordance with applicable regulatory requirements.',
    },

    { kind: 'h', text: '8. Your Privacy Rights' },
    { kind: 'sub', text: '8.1 Rights for All Users' },
    { kind: 'p', text: 'Regardless of your location, you have the right to:' },
    {
      kind: 'bullets',
      items: [
        'Access the personal information we hold about you',
        'Correct inaccurate personal information',
        'Delete your account and associated personal information (subject to legal retention requirements)',
        'Export your data in a portable format',
        'Withdraw consent for any processing based on consent (including health-related inputs)',
        'Opt out of any future sale or sharing of your personal information (we do not currently sell data, but this right applies prospectively)',
      ],
    },
    { kind: 'sub', text: '8.2 California Residents (CCPA/CPRA)' },
    {
      kind: 'p',
      text:
        'California residents have the following additional rights under the CCPA as amended by the CPRA and 2026 CCPA Regulations:',
    },
    {
      kind: 'bullets',
      items: [
        'Right to Know: the right to know what personal information we collect, use, disclose, and sell about you, including the categories of sources, the business purpose, and the categories of third parties with whom we share it',
        'Right to Delete: the right to request deletion of personal information we have collected, subject to certain exceptions',
        'Right to Correct: the right to correct inaccurate personal information',
        'Right to Opt-Out: the right to opt out of the sale or sharing of personal information (we do not currently sell data)',
        'Right to Limit Use of Sensitive Personal Information: the right to limit our use and disclosure of your sensitive personal information (which includes your health-related inputs, location data, and account login credentials) to uses necessary to provide the Services',
        'Right to Non-Discrimination: we will not discriminate against you for exercising your CCPA rights',
        'Right to Know About Automated Decision-Making: we use algorithmic processing to calculate your UV protection estimates. This processing constitutes automated decision-making that affects your use of the Services. You have the right to request information about this processing and to opt out where applicable',
      ],
    },
    {
      kind: 'p',
      text:
        'To exercise your California rights, submit a request through the App\'s Settings > Privacy menu, by emailing privacy@sureva.com, or by calling our toll-free number. We will verify your identity before processing requests. We will respond within 45 days; if additional time is needed, we will notify you and may extend the period by an additional 45 days.',
    },
    {
      kind: 'p',
      text:
        'If you use a Global Privacy Control (GPC) signal, we will treat it as a valid opt-out of sale/sharing and confirm processing of the request as required by the 2026 CCPA Regulations.',
    },
    { kind: 'sub', text: '8.3 EEA Residents (GDPR)' },
    { kind: 'p', text: 'If you are located in the European Economic Area, you have the following rights:' },
    {
      kind: 'bullets',
      items: [
        'Right of access (Article 15)',
        'Right to rectification (Article 16)',
        "Right to erasure / 'right to be forgotten' (Article 17)",
        'Right to restriction of processing (Article 18)',
        'Right to data portability (Article 20)',
        'Right to object to processing based on legitimate interests (Article 21)',
        'Right not to be subject to solely automated decision-making with legal or similarly significant effects (Article 22). Note that our algorithm generates wellness recommendations, not legally significant decisions',
        'Right to lodge a complaint with your local supervisory authority',
      ],
    },
    {
      kind: 'p',
      text:
        'To exercise your GDPR rights, contact our Data Protection Representative at privacy@sureva.com. We will respond within 30 days of receiving a verified request.',
    },
    { kind: 'sub', text: '8.4 Other U.S. State Privacy Rights' },
    {
      kind: 'p',
      text:
        'Residents of states with comprehensive consumer privacy laws (including Virginia, Colorado, Connecticut, Texas, Utah, Iowa, Indiana, Tennessee, Montana, Oregon, Delaware, New Hampshire, New Jersey, Nebraska, Minnesota, Maryland, and Rhode Island, among others) may have additional privacy rights under applicable state law, including rights to access, correct, delete, and opt out of certain data processing. We will honor valid rights requests from residents of all states with enacted consumer privacy laws. Contact privacy@sureva.com to submit a request.',
    },

    { kind: 'h', text: "9. Children's Privacy" },
    {
      kind: 'p',
      text:
        "Sureva's Services are designed for users 13 years of age and older. We do not knowingly collect personal information from children under 13 without verifiable parental consent as required by the Children's Online Privacy Protection Act (COPPA).",
    },
    {
      kind: 'p',
      text:
        'Family Mode features allow an adult account holder to add minors (ages 13-17) as Device users. When a minor uses the Services under Family Mode:',
    },
    {
      kind: 'bullets',
      items: [
        'The primary account holder (parent or guardian) is responsible for ensuring appropriate consent',
        "We collect and process the minor's data as described in this policy under the account holder's authorization",
        "Parents and guardians may review, correct, or delete data associated with their child's Device at any time through the App or by contacting privacy@sureva.com",
      ],
    },
    {
      kind: 'p',
      text:
        'If we learn that we have inadvertently collected personal information from a child under 13 without appropriate consent, we will promptly delete that information. If you believe we may have collected information from a child under 13 without proper consent, please contact privacy@sureva.com immediately.',
    },
    {
      kind: 'p',
      text:
        'Users under 18 may have additional protections under applicable state law, including the App Store Accountability Acts in effect in Texas (effective January 1, 2026), Louisiana, Utah, and California (effective dates vary). We will comply with applicable requirements as they take effect.',
    },

    { kind: 'h', text: '10. International Data Transfers' },
    {
      kind: 'p',
      text:
        'Sureva is based in the United States. If you are located outside the United States, please be aware that your information may be transferred to and processed in the United States, where data protection laws may differ from those in your home country.',
    },
    {
      kind: 'p',
      text:
        'For users in the European Economic Area, we implement appropriate safeguards for international transfers as required under GDPR, including Standard Contractual Clauses (SCCs) approved by the European Commission. You may request information about the specific safeguards applicable to your data by contacting privacy@sureva.com.',
    },

    { kind: 'h', text: '11. Third-Party Services and Links' },
    {
      kind: 'p',
      text:
        'The Services may integrate with or reference third-party platforms (such as Apple HealthKit or Google Fit). We are not responsible for the privacy practices of third parties. We encourage you to review the privacy policies of any third-party services you choose to connect to your Sureva account. Data you share with third-party health platforms is governed by those platforms\' terms, not this policy.',
    },

    { kind: 'h', text: '12. Changes to This Privacy Policy' },
    {
      kind: 'p',
      text:
        'We may update this Privacy Policy periodically to reflect changes in our practices, technology, legal requirements, or for other business reasons. We will notify you of material changes by:',
    },
    {
      kind: 'bullets',
      items: [
        'Posting the updated policy in the App with a revised effective date',
        'Sending an in-app notification and/or email to the address associated with your account',
        'Requiring you to acknowledge the updated policy upon next login for material changes',
      ],
    },
    {
      kind: 'p',
      text:
        'We will review and update this policy at least once every 12 months as required by California law. Your continued use of the Services after the effective date of an updated policy constitutes your acceptance of the changes.',
    },

    { kind: 'h', text: '13. Contact Us, Privacy' },
    {
      kind: 'p',
      text:
        'If you have questions, concerns, or requests relating to this Privacy Policy or our data practices, please contact us:',
    },
    {
      kind: 'bullets',
      items: [
        'Sureva, Inc.',
        'Attn: Privacy Team',
        'Email: privacy@sureva.com',
      ],
    },
    {
      kind: 'p',
      text:
        'We will respond to all privacy inquiries within 30 days. For California residents, we will respond to verifiable consumer requests within 45 days.',
    },
  ],
};

export const TERMS_OF_SERVICE = {
  title: 'Terms of Service',
  intro:
    'These Terms of Service ("Terms") constitute a legally binding agreement between you and Sureva, Inc. ("Sureva," "we," "us," or "our") governing your access to and use of the Sureva mobile application ("App"), the Sureva wearable UV monitoring device ("Device"), and all related services, features, content, and functionality (collectively, the "Services").',
  blocks: [
    {
      kind: 'callout',
      text:
        'PLEASE READ THESE TERMS OF SERVICE CAREFULLY. BY CREATING AN ACCOUNT, DOWNLOADING THE APP, PAIRING YOUR DEVICE, OR OTHERWISE USING THE SERVICES, YOU AGREE TO BE BOUND BY THESE TERMS. IF YOU DO NOT AGREE, DO NOT USE THE SERVICES.',
    },
    {
      kind: 'callout',
      text:
        'SECTION 19 OF THESE TERMS CONTAINS A BINDING ARBITRATION CLAUSE AND CLASS ACTION WAIVER THAT AFFECT YOUR LEGAL RIGHTS. PLEASE READ SECTION 19 CAREFULLY.',
    },

    { kind: 'h', text: '1. Acceptance of Terms' },
    {
      kind: 'p',
      text:
        'By using the Services, you represent that: (a) you are at least 13 years of age; (b) if you are between 13 and 18, you have obtained verifiable parental or guardian consent; (c) you have the legal capacity to enter into a binding agreement; and (d) your use of the Services does not violate any applicable law or regulation.',
    },
    {
      kind: 'p',
      text:
        'These Terms incorporate our Privacy Policy by reference. In the event of a conflict between these Terms and the Privacy Policy, the Privacy Policy governs with respect to data privacy matters.',
    },

    { kind: 'h', text: '2. Description of Services' },
    { kind: 'p', text: 'Sureva provides a general wellness platform consisting of:' },
    {
      kind: 'bullets',
      items: [
        'The Sureva wearable Device, which uses UV, temperature, humidity, and accelerometer sensors to monitor ambient environmental conditions',
        'The Sureva App, which receives sensor data from the Device via Bluetooth Low Energy (BLE), applies the Sureva protection algorithm to estimate sunscreen depletion, and provides reapplication reminders',
        'A personal history dashboard showing session data, UV exposure trends, and behavioral patterns over time',
        'Optional features including session sharing, clinician data export, and Family Mode',
      ],
    },
    {
      kind: 'callout',
      text:
        'THE SERVICES ARE INTENDED FOR GENERAL WELLNESS AND INFORMATIONAL PURPOSES ONLY. THE SERVICES DO NOT CONSTITUTE MEDICAL ADVICE, DIAGNOSIS, OR TREATMENT. THE DEVICE IS NOT A MEDICAL DEVICE AND HAS NOT BEEN CLEARED OR APPROVED BY THE FOOD AND DRUG ADMINISTRATION FOR ANY MEDICAL PURPOSE. ALWAYS FOLLOW THE DIRECTIONS ON YOUR SUNSCREEN PRODUCT AND CONSULT A HEALTHCARE PROFESSIONAL REGARDING SUN PROTECTION FOR YOUR SPECIFIC MEDICAL NEEDS.',
    },

    { kind: 'h', text: '3. Account Registration' },
    { kind: 'sub', text: '3.1 Account Creation' },
    {
      kind: 'p',
      text:
        'To access the Services, you must create an account. You agree to provide accurate, complete, and current information during registration and to update your information to keep it accurate and current. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.',
    },
    { kind: 'sub', text: '3.2 Account Security' },
    {
      kind: 'p',
      text:
        'You agree to: (a) use a strong, unique password for your Sureva account; (b) notify us immediately at support@sureva.com if you suspect unauthorized access to your account; and (c) not share your account credentials with any third party. Sureva is not liable for any loss arising from unauthorized use of your account where you have failed to keep your credentials secure.',
    },
    { kind: 'sub', text: '3.3 One Account Per Person' },
    {
      kind: 'p',
      text:
        'Each person may maintain only one personal Sureva account. You may manage multiple Devices under a single account using Family Mode features. Creating multiple accounts to circumvent service restrictions is prohibited.',
    },

    { kind: 'h', text: '4. The Sureva Device' },
    { kind: 'sub', text: '4.1 Device Purchase and Ownership' },
    {
      kind: 'p',
      text:
        'Your purchase of the Sureva Device is governed by the sales terms provided at the time of purchase. These Terms of Service govern your use of the Device in connection with the App and Services.',
    },
    { kind: 'sub', text: '4.2 Device Pairing and Connectivity' },
    {
      kind: 'p',
      text:
        'The Device communicates with the App via Bluetooth Low Energy. You are responsible for maintaining your mobile device\'s Bluetooth functionality. Sureva is not responsible for degraded performance due to Bluetooth interference, distance limitations, or your mobile device\'s operating system restrictions. The accuracy of protection estimates depends on consistent Device connectivity; during periods of disconnection (dead reckoning mode), estimates are extrapolated from the last known readings and may be less accurate.',
    },
    { kind: 'sub', text: '4.3 Firmware Updates' },
    {
      kind: 'p',
      text:
        'We may release firmware updates for the Device that are transmitted via the App. Some updates may be required to continue using the Services. You agree to install required updates within a reasonable time. We are not responsible for Device performance issues arising from failure to install available updates.',
    },
    { kind: 'sub', text: '4.4 Device Limitations and Accuracy' },
    {
      kind: 'p',
      text:
        'The Device is a consumer wellness product, not a precision scientific instrument. UV index readings, protection percentage estimates, and reapplication timing recommendations are approximations based on sensor data and the Sureva algorithm. Actual sunscreen performance depends on many factors outside the Device\'s measurement capability, including: the specific sunscreen formulation used, skin surface coverage and uniformity of application, individual skin characteristics, physical activity intensity, and contact with fabrics and surfaces. You acknowledge these limitations and agree not to rely exclusively on the Services for sun protection decisions.',
    },
    { kind: 'sub', text: '4.5 Prohibited Device Uses' },
    {
      kind: 'p',
      text:
        'You agree not to: (a) disassemble, reverse engineer, or modify the Device hardware; (b) use the Device for any purpose other than personal wellness monitoring; (c) resell or transfer a paired Device without first unpairing it and removing your account data; (d) attempt to access or modify Device firmware through unauthorized means.',
    },

    { kind: 'h', text: '5. License to Use the App' },
    {
      kind: 'p',
      text:
        'Subject to your compliance with these Terms, Sureva grants you a limited, non-exclusive, non-transferable, revocable license to download and use the App on mobile devices you own or control, solely for your personal, non-commercial use in connection with the Services.',
    },
    {
      kind: 'p',
      text:
        'You agree not to: (a) copy, modify, or distribute the App; (b) reverse engineer, decompile, or disassemble the App except as permitted by applicable law; (c) rent, lease, or sublicense the App; (d) remove any proprietary notices from the App; (e) use the App in any manner that violates applicable law; (f) use automated tools to access or interact with the Services; or (g) interfere with or disrupt the security or integrity of the Services.',
    },

    { kind: 'h', text: '6. User Content' },
    {
      kind: 'p',
      text:
        'The Services allow you to input certain information ("User Content") including profile details, session notes, and custom environment labels. You retain ownership of your User Content. By providing User Content, you grant Sureva a non-exclusive, worldwide, royalty-free license to use, store, and process your User Content solely to provide the Services to you.',
    },
    {
      kind: 'p',
      text:
        'You are responsible for ensuring that any User Content you provide is accurate, does not violate any third-party rights, and complies with applicable law. Sureva does not verify the accuracy of User Content and is not responsible for any consequences arising from inaccurate User Content.',
    },

    { kind: 'h', text: '7. Subscription, Fees, and Payments' },
    { kind: 'sub', text: '7.1 Free and Paid Features' },
    {
      kind: 'p',
      text:
        'Sureva may offer both free features and premium subscription features. Free features are available to all registered users. Premium subscription features require payment of applicable fees.',
    },
    { kind: 'sub', text: '7.2 Subscription Terms' },
    {
      kind: 'p',
      text:
        'If you purchase a subscription: (a) subscriptions automatically renew at the end of each billing period unless cancelled before the renewal date; (b) you authorize Sureva (or our payment processor) to charge your payment method for the applicable subscription fee at the start of each renewal period; (c) subscription prices may change with 30 days\' prior notice; and (d) no refunds will be provided for partial subscription periods except as required by applicable law.',
    },
    { kind: 'sub', text: '7.3 Cancellation' },
    {
      kind: 'p',
      text:
        'You may cancel your subscription at any time through the App (Settings > Subscription > Cancel) or through your Apple App Store or Google Play account. Cancellation takes effect at the end of the current billing period. Cancellation of a subscription does not delete your account or your data.',
    },
    { kind: 'sub', text: '7.4 Free Trials' },
    {
      kind: 'p',
      text:
        'If you begin a free trial, you will not be charged until the trial period ends. If you do not cancel before the trial ends, you will be automatically charged the applicable subscription fee. We will notify you before the trial ends.',
    },
    { kind: 'sub', text: '7.5 Refunds' },
    {
      kind: 'p',
      text:
        'Subscription purchases made through the Apple App Store or Google Play are subject to those platforms\' refund policies. For direct purchases, refund requests must be submitted to support@sureva.com within 14 days of charge. Refunds are not guaranteed and are evaluated on a case-by-case basis.',
    },

    { kind: 'h', text: '8. Health and Safety Disclaimer' },
    { kind: 'callout', text: 'THIS SECTION IS CRITICALLY IMPORTANT. PLEASE READ IT CAREFULLY.' },
    {
      kind: 'p',
      text:
        'THE SUREVA SERVICES ARE A GENERAL WELLNESS TOOL. THEY ARE NOT DESIGNED, INTENDED, OR AUTHORIZED FOR USE IN THE DIAGNOSIS, TREATMENT, CURE, MITIGATION, OR PREVENTION OF ANY DISEASE OR MEDICAL CONDITION. THE SERVICES ARE NOT A SUBSTITUTE FOR PROFESSIONAL MEDICAL ADVICE, DIAGNOSIS, OR TREATMENT.',
    },
    {
      kind: 'p',
      text:
        'SUN PROTECTION IS A SERIOUS HEALTH MATTER. EXCESSIVE ULTRAVIOLET RADIATION EXPOSURE IS ASSOCIATED WITH SKIN CANCER, SUNBURN, PREMATURE AGING, AND OTHER HEALTH EFFECTS. SUREVA\'S PROTECTION ESTIMATES ARE BASED ON SENSOR READINGS AND ALGORITHMIC CALCULATIONS THAT INVOLVE APPROXIMATIONS AND ASSUMPTIONS. ACTUAL PROTECTION LEVELS DEPEND ON MANY FACTORS THE DEVICE CANNOT MEASURE.',
    },
    { kind: 'p', text: 'YOU SHOULD ALWAYS:' },
    {
      kind: 'bullets',
      items: [
        'Apply sunscreen according to the directions on the product label, regardless of what the App indicates',
        'Reapply sunscreen at the interval stated on the product label (generally every 2 hours) as a minimum, in addition to any Sureva recommendations',
        'Consult a dermatologist or other qualified healthcare professional regarding sun protection appropriate for your skin type, medical conditions, and medications',
        'Take additional sun protection measures including protective clothing, hats, and seeking shade',
        'Not delay seeking medical advice or treatment for sunburn, skin changes, or other health concerns based on information from the Services',
      ],
    },

    { kind: 'h', text: '9. Algorithmic Processing Disclosure' },
    {
      kind: 'p',
      text:
        'The Sureva protection algorithm uses automated processing to calculate estimated UV protection remaining based on your profile inputs and real-time sensor data. The algorithm applies mathematical models incorporating factors including UV index, temperature, humidity, activity level, SPF value, water resistance rating, skin type, and environmental reflectivity.',
    },
    {
      kind: 'p',
      text:
        "YOU ACKNOWLEDGE THAT: (a) the algorithm's outputs are estimates, not precise measurements; (b) the algorithm has been designed to provide conservative (protective) recommendations but may not account for all factors affecting sunscreen performance; (c) the algorithm's estimates do not guarantee a specific level of UV protection; and (d) you have received appropriate disclosure regarding automated processing of your personal data for these purposes as required under applicable privacy law.",
    },
    { kind: 'sub', text: '9.1 AI-Generated Narrative Insights' },
    {
      kind: 'p',
      text:
        'Separately from the protection algorithm described above, Sureva uses (and may expand its use of) third-party artificial intelligence and large language model ("AI") technology, including services provided by Anthropic PBC, to generate personalized narrative summaries and insights based on your session and profile data ("AI-Generated Insights"). AI-Generated Insights are provided for general wellness and informational purposes only, do not constitute medical advice, and are never required for core Services functionality. If the AI provider is unavailable or a request fails, the Services will display your session summary without AI-Generated Insights rather than blocking your access to the Services. Use of AI-Generated Insights involves transmitting a limited set of your data to the third-party AI provider as described in our Privacy Policy, Section 3.6.',
    },

    { kind: 'h', text: '10. Bluetooth and Location Permissions' },
    {
      kind: 'p',
      text:
        'The Services require Bluetooth permission to communicate with your Device. The Services request location permission ("when in use" only) to automatically detect your outdoor environment. You may deny location permission and manually select your environment instead. Denying location permission does not impair core Services functionality.',
    },
    {
      kind: 'p',
      text:
        'If Bluetooth is disabled on your device or your Device is out of range, the App will operate in dead reckoning mode, using extrapolated estimates based on the last known conditions. Estimates in dead reckoning mode are less accurate. You are responsible for ensuring your Device remains charged and connected during sessions for optimal accuracy.',
    },

    { kind: 'h', text: '11. Third-Party Services' },
    {
      kind: 'p',
      text:
        'The Services may integrate with third-party platforms including Apple HealthKit, Google Fit, and others. Your use of third-party services is governed by those services\' terms and privacy policies. Sureva is not responsible for the practices or content of third-party services. You may disconnect third-party integrations at any time through App settings.',
    },

    { kind: 'h', text: '12. Intellectual Property' },
    {
      kind: 'p',
      text:
        'All content, features, and functionality of the Services, including but not limited to the App software, Device firmware, protection algorithm, logos, design, text, graphics, and user interface elements, are owned by Sureva or its licensors and are protected by copyright, trademark, patent, and other intellectual property laws.',
    },
    {
      kind: 'p',
      text:
        'Sureva\'s name, logo, and related marks are trademarks of Sureva, Inc. You may not use Sureva\'s trademarks without our prior written consent. Nothing in these Terms transfers any intellectual property rights to you.',
    },

    { kind: 'h', text: '13. Prohibited Conduct' },
    { kind: 'p', text: 'You agree not to use the Services to:' },
    {
      kind: 'bullets',
      items: [
        'Violate any applicable local, state, federal, national, or international law or regulation',
        'Impersonate any person or entity or misrepresent your affiliation with any person or entity',
        'Collect or harvest personal information about other users',
        'Transmit any unsolicited commercial communications',
        'Introduce malicious code, viruses, or other harmful material',
        'Interfere with or disrupt the Services or servers or networks connected to the Services',
        'Circumvent any security or access control features of the Services',
        'Use the Services for any commercial purpose without our written consent',
        "Attempt to access another user's account",
        'Engage in any activity that could damage, disable, or impair the Services',
      ],
    },

    { kind: 'h', text: '14. Termination' },
    { kind: 'sub', text: '14.1 Termination by You' },
    {
      kind: 'p',
      text:
        'You may terminate your account at any time by selecting "Delete Account" in App settings or by contacting support@sureva.com. Termination results in deletion of your account and personal data in accordance with our Privacy Policy and applicable law.',
    },
    { kind: 'sub', text: '14.2 Termination by Sureva' },
    {
      kind: 'p',
      text:
        'We reserve the right to suspend or terminate your access to the Services at any time, with or without notice, if: (a) you violate these Terms; (b) we are required to do so by law; (c) we determine that your use of the Services poses a risk to other users or to the security of the Services; or (d) we discontinue the Services.',
    },
    { kind: 'sub', text: '14.3 Effect of Termination' },
    {
      kind: 'p',
      text:
        'Upon termination: (a) your license to use the App and Services immediately terminates; (b) your access to your data through the Services will cease; and (c) you may request a data export before termination takes effect. Sections 8, 9, 12, 15, 16, 17, 18, 19, and 20 of these Terms survive termination.',
    },

    { kind: 'h', text: '15. Disclaimer of Warranties' },
    {
      kind: 'p',
      text:
        'THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, NON-INFRINGEMENT, OR COURSE OF PERFORMANCE.',
    },
    {
      kind: 'p',
      text:
        'SUREVA DOES NOT WARRANT THAT: (a) THE SERVICES WILL FUNCTION WITHOUT INTERRUPTION OR ERRORS; (b) ANY INFORMATION PROVIDED THROUGH THE SERVICES IS ACCURATE, COMPLETE, OR RELIABLE; (c) THE SERVICES WILL MEET YOUR REQUIREMENTS OR EXPECTATIONS; (d) ANY DEFECTS IN THE SERVICES WILL BE CORRECTED; OR (e) THE DEVICE WILL ACCURATELY MEASURE UV INDEX OR PREDICT SUNSCREEN DEPLETION WITH SCIENTIFIC PRECISION.',
    },
    {
      kind: 'p',
      text:
        'SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF CERTAIN WARRANTIES. IF YOU ARE A CONSUMER IN SUCH A JURISDICTION, SOME OR ALL OF THE ABOVE EXCLUSIONS MAY NOT APPLY TO YOU.',
    },

    { kind: 'h', text: '16. Limitation of Liability' },
    {
      kind: 'p',
      text:
        'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL SUREVA, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, SUPPLIERS, OR LICENSORS BE LIABLE FOR:',
    },
    {
      kind: 'bullets',
      items: [
        'ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES',
        'LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES',
        'PERSONAL INJURY OR PROPERTY DAMAGE ARISING FROM YOUR USE OF THE SERVICES',
        'HEALTH OUTCOMES INCLUDING BUT NOT LIMITED TO SUNBURN, SKIN DAMAGE, OR SKIN CANCER, WHETHER OR NOT CAUSED IN WHOLE OR IN PART BY RELIANCE ON THE SERVICES',
        'UNAUTHORIZED ACCESS TO OR ALTERATION OF YOUR DATA',
        'ANY THIRD-PARTY CONDUCT OR CONTENT',
        'ANY BUGS, VIRUSES, OR OTHER HARMFUL CODE TRANSMITTED THROUGH THE SERVICES',
      ],
    },
    {
      kind: 'p',
      text:
        'IN JURISDICTIONS WHERE LIMITATION OF LIABILITY IS PERMITTED, SUREVA\'S TOTAL CUMULATIVE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICES SHALL NOT EXCEED THE GREATER OF: (A) THE TOTAL AMOUNT YOU PAID TO SUREVA IN THE 12 MONTHS PRECEDING THE CLAIM; OR (B) ONE HUNDRED U.S. DOLLARS ($100).',
    },
    {
      kind: 'p',
      text:
        'SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES. IN SUCH JURISDICTIONS, OUR LIABILITY SHALL BE LIMITED TO THE GREATEST EXTENT PERMITTED BY APPLICABLE LAW.',
    },
    {
      kind: 'p',
      text:
        'THE LIMITATIONS IN THIS SECTION SHALL APPLY TO ANY THEORY OF LIABILITY, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR ANY OTHER LEGAL THEORY, AND WHETHER OR NOT SUREVA HAS BEEN INFORMED OF THE POSSIBILITY OF SUCH DAMAGES.',
    },

    { kind: 'h', text: '17. Indemnification' },
    {
      kind: 'p',
      text:
        'You agree to defend, indemnify, and hold harmless Sureva, its officers, directors, employees, agents, licensors, service providers, and successors from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, and fees (including reasonable attorneys\' fees) arising out of or relating to: (a) your violation of these Terms; (b) your use of the Services; (c) your User Content; (d) your violation of any third-party right; or (e) your violation of any applicable law. Your indemnification obligations shall survive termination of these Terms for a period of five (5) years.',
    },

    { kind: 'h', text: '18. Governing Law and Jurisdiction' },
    {
      kind: 'p',
      text:
        'These Terms are governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Subject to the arbitration agreement in Section 19, any legal action or proceeding arising under these Terms shall be brought exclusively in the federal or state courts located in Delaware, and you consent to the personal jurisdiction and venue of such courts.',
    },
    {
      kind: 'p',
      text:
        'If you are a consumer located in the European Union, nothing in these Terms affects your rights under the laws of your country of residence.',
    },

    { kind: 'h', text: '19. Dispute Resolution and Arbitration' },
    {
      kind: 'callout',
      text:
        'PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR RIGHTS INCLUDING YOUR RIGHT TO FILE A LAWSUIT IN COURT.',
    },
    { kind: 'sub', text: '19.1 Informal Resolution' },
    {
      kind: 'p',
      text:
        'Before initiating arbitration, you agree to contact us at legal@sureva.com with a written description of your dispute and desired resolution. We will attempt to resolve the dispute informally within 30 days. If we cannot resolve the dispute informally, either party may proceed to arbitration.',
    },
    { kind: 'sub', text: '19.2 Binding Arbitration' },
    {
      kind: 'p',
      text:
        'Except as set forth in Section 19.5, any dispute, controversy, or claim arising out of or relating to these Terms or the Services, including the determination of the scope or applicability of this arbitration agreement, shall be determined by binding arbitration administered by JAMS under its Streamlined Arbitration Rules and Procedures (for claims not exceeding $250,000) or its Comprehensive Arbitration Rules (for claims exceeding $250,000). The arbitration shall take place by telephone or videoconference at your election. The arbitrator\'s decision shall be final and binding.',
    },
    { kind: 'sub', text: '19.3 Class Action Waiver' },
    {
      kind: 'p',
      text:
        'YOU AND SUREVA AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING. The arbitrator may not consolidate more than one person\'s claims and may not otherwise preside over any form of a representative or class proceeding.',
    },
    { kind: 'sub', text: '19.4 Arbitration Fees' },
    {
      kind: 'p',
      text:
        'Payment of arbitration filing fees, administrative fees, and arbitrator compensation shall be governed by JAMS Rules. We will pay your share of arbitration fees for claims not exceeding $10,000 if you are unable to afford them.',
    },
    { kind: 'sub', text: '19.5 Exceptions' },
    {
      kind: 'p',
      text:
        'Notwithstanding the foregoing, either party may: (a) bring an individual action in small claims court for disputes within the court\'s jurisdiction; (b) seek emergency injunctive or other equitable relief from a court of competent jurisdiction to prevent actual or threatened infringement, misappropriation, or violation of intellectual property rights; or (c) assert claims related to the enforceability of this arbitration agreement in a court of competent jurisdiction.',
    },
    { kind: 'sub', text: '19.6 Opt-Out' },
    {
      kind: 'p',
      text:
        'You may opt out of this arbitration agreement by sending written notice to legal@sureva.com within 30 days of first accepting these Terms. Your notice must include your name, the email address associated with your account, and a statement that you wish to opt out of the arbitration agreement. Opting out does not affect any other provision of these Terms.',
    },
    { kind: 'sub', text: '19.7 Survival' },
    { kind: 'p', text: 'This arbitration agreement survives termination of your account and/or the Services.' },

    { kind: 'h', text: '20. Family Mode Terms' },
    {
      kind: 'p',
      text:
        'Family Mode allows an adult account holder ("Family Account Manager") to manage multiple Devices under a single account. By using Family Mode, the Family Account Manager represents that: (a) they have legal authority to consent on behalf of any minor Device users; (b) they have obtained appropriate consent from any adult Device users added to the account; (c) they understand that all Device users\' data will be accessible to the Family Account Manager; and (d) they accept responsibility for all use of the Services under the family account.',
    },
    {
      kind: 'p',
      text:
        'Adding a Device user to a family account without that person\'s knowledge and consent is a violation of these Terms and may violate applicable privacy laws.',
    },

    { kind: 'h', text: '21. Updates to Services and Terms' },
    { kind: 'sub', text: '21.1 Updates to Services' },
    {
      kind: 'p',
      text:
        'We reserve the right to modify, suspend, or discontinue any aspect of the Services at any time, with or without notice. We are not liable to you or any third party for any modification, suspension, or discontinuation of the Services.',
    },
    { kind: 'sub', text: '21.2 Updates to These Terms' },
    {
      kind: 'p',
      text:
        'We may update these Terms at any time. We will notify you of material changes by posting the updated Terms in the App with a revised effective date and by sending an in-app notification and/or email. For material changes, we may require you to affirmatively accept the updated Terms. Your continued use of the Services after the effective date of updated Terms constitutes acceptance of the changes. If you do not agree to updated Terms, you must stop using the Services and delete your account.',
    },

    { kind: 'h', text: '22. Notices' },
    {
      kind: 'p',
      text:
        'Notices to you will be provided via in-app notifications and/or email to the address associated with your account. Notices to Sureva must be sent by email to legal@sureva.com or by certified mail to:',
    },
    {
      kind: 'bullets',
      items: ['Sureva, Inc.', 'Attn: Legal Department', 'Email: legal@sureva.com'],
    },

    { kind: 'h', text: '23. General Provisions' },
    { kind: 'sub', text: '23.1 Entire Agreement' },
    {
      kind: 'p',
      text:
        'These Terms, together with the Privacy Policy and any additional terms applicable to specific features or promotions, constitute the entire agreement between you and Sureva regarding the Services and supersede all prior agreements, representations, and understandings.',
    },
    { kind: 'sub', text: '23.2 Severability' },
    {
      kind: 'p',
      text:
        'If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall continue in full force and effect.',
    },
    { kind: 'sub', text: '23.3 Waiver' },
    {
      kind: 'p',
      text:
        'Sureva\'s failure to enforce any provision of these Terms shall not constitute a waiver of that provision or of Sureva\'s right to enforce it in the future.',
    },
    { kind: 'sub', text: '23.4 Assignment' },
    {
      kind: 'p',
      text:
        'You may not assign or transfer these Terms or any rights or obligations hereunder without Sureva\'s prior written consent. Sureva may assign these Terms in connection with a merger, acquisition, or sale of assets, or by operation of law. These Terms bind and inure to the benefit of the parties and their respective successors and permitted assigns.',
    },
    { kind: 'sub', text: '23.5 Force Majeure' },
    {
      kind: 'p',
      text:
        'Sureva shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control, including acts of God, natural disasters, pandemic, government action, telecommunications failures, or third-party service failures.',
    },
    { kind: 'sub', text: '23.6 No Third-Party Beneficiaries' },
    { kind: 'p', text: 'These Terms do not create any third-party beneficiary rights.' },
    { kind: 'sub', text: '23.7 Language' },
    {
      kind: 'p',
      text:
        'These Terms were written in English. To the extent any translated version conflicts with the English version, the English version shall control.',
    },
    { kind: 'sub', text: '23.8 Headings' },
    { kind: 'p', text: 'Section headings in these Terms are for convenience only and have no legal effect.' },

    { kind: 'h', text: 'Contact Information' },
    { kind: 'p', text: 'For general support inquiries: support@sureva.com' },
    { kind: 'p', text: 'For privacy requests and inquiries: privacy@sureva.com' },
    { kind: 'p', text: 'For legal notices: legal@sureva.com' },
    { kind: 'p', text: '© 2026 Sureva, Inc. All rights reserved.' },
  ],
};

export const ACCESSIBILITY_STATEMENT = {
  title: 'Accessibility Statement',
  intro:
    'Sureva, Inc. is committed to making the Sureva App usable by everyone, including people with disabilities. This statement describes our current accessibility posture and how to reach us about accessibility issues.',
  blocks: [
    { kind: 'h', text: 'Our Commitment' },
    {
      kind: 'p',
      text:
        'We are working toward conformance with the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA, adapted for a native mobile context, and with applicable requirements under the Americans with Disabilities Act (ADA). Accessibility is an ongoing effort rather than a one-time project, and we review and improve the App on a continuing basis.',
    },
    { kind: 'h', text: 'What the App Currently Supports' },
    {
      kind: 'bullets',
      items: [
        'High-contrast color choices and large, legible text sizing throughout the App, designed for outdoor/bright-sunlight readability',
        'Standard iOS system behaviors inherited automatically where we have not overridden them (e.g. system-level display and interaction settings)',
      ],
    },
    { kind: 'h', text: 'Known Gaps' },
    {
      kind: 'p',
      text:
        'Full screen-reader support (VoiceOver) and complete Dynamic Type (adjustable system text size) support are not yet implemented consistently across every screen. We are actively working to add these. If a specific screen or feature is not usable with an assistive technology you rely on, please tell us — see Contact below — so we can prioritize it.',
    },
    { kind: 'h', text: 'Feedback and Contact' },
    {
      kind: 'p',
      text:
        'If you experience any difficulty accessing any part of the Sureva App, or if you have suggestions for improving accessibility, please contact us at accessibility@sureva.com. We aim to respond within 5 business days and will work with you to provide the information, item, or service you seek through an alternative means if possible.',
    },
  ],
};
