import { parsePhoneNumberFromString, CountryCode, PhoneNumber } from 'libphonenumber-js'

export interface PhoneResult {
  phone: string
  valid: boolean
  score: number
  formatted: {
    international: string
    national: string
    e164: string
  }
  country: string
  country_name: string
  type: string | null
  carrier: string | null
}

// Country code to country name mapping
const COUNTRY_NAMES: Record<string, string> = {
  'US': 'United States',
  'CA': 'Canada',
  'GB': 'United Kingdom',
  'AU': 'Australia',
  'DE': 'Germany',
  'FR': 'France',
  'IT': 'Italy',
  'ES': 'Spain',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'CH': 'Switzerland',
  'AT': 'Austria',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'FI': 'Finland',
  'PL': 'Poland',
  'CZ': 'Czech Republic',
  'HU': 'Hungary',
  'RO': 'Romania',
  'BG': 'Bulgaria',
  'GR': 'Greece',
  'PT': 'Portugal',
  'IE': 'Ireland',
  'IS': 'Iceland',
  'MT': 'Malta',
  'CY': 'Cyprus',
  'LU': 'Luxembourg',
  'LV': 'Latvia',
  'LT': 'Lithuania',
  'EE': 'Estonia',
  'SK': 'Slovakia',
  'SI': 'Slovenia',
  'HR': 'Croatia',
  'MX': 'Mexico',
  'BR': 'Brazil',
  'AR': 'Argentina',
  'CL': 'Chile',
  'CO': 'Colombia',
  'PE': 'Peru',
  'VE': 'Venezuela',
  'EC': 'Ecuador',
  'BO': 'Bolivia',
  'UY': 'Uruguay',
  'PY': 'Paraguay',
  'GY': 'Guyana',
  'SR': 'Suriname',
  'JP': 'Japan',
  'KR': 'South Korea',
  'CN': 'China',
  'IN': 'India',
  'TH': 'Thailand',
  'VN': 'Vietnam',
  'PH': 'Philippines',
  'MY': 'Malaysia',
  'SG': 'Singapore',
  'ID': 'Indonesia',
  'ZA': 'South Africa',
  'NG': 'Nigeria',
  'EG': 'Egypt',
  'KE': 'Kenya',
  'GH': 'Ghana',
  'MA': 'Morocco',
  'TN': 'Tunisia',
  'DZ': 'Algeria',
  'ET': 'Ethiopia',
  'UG': 'Uganda',
  'TZ': 'Tanzania',
  'ZM': 'Zambia',
  'ZW': 'Zimbabwe',
  'MZ': 'Mozambique',
  'AO': 'Angola',
  'CM': 'Cameroon',
  'SN': 'Senegal',
  'ML': 'Mali',
  'BF': 'Burkina Faso',
  'NE': 'Niger',
  'TD': 'Chad',
  'CF': 'Central African Republic',
  'CG': 'Republic of the Congo',
  'CD': 'Democratic Republic of the Congo',
  'GA': 'Gabon',
  'GQ': 'Equatorial Guinea',
  'ST': 'São Tomé and Príncipe',
  'RU': 'Russia',
  'UA': 'Ukraine',
  'BY': 'Belarus',
  'MD': 'Moldova',
  'GE': 'Georgia',
  'AM': 'Armenia',
  'AZ': 'Azerbaijan',
  'KZ': 'Kazakhstan',
  'KG': 'Kyrgyzstan',
  'TJ': 'Tajikistan',
  'TM': 'Turkmenistan',
  'UZ': 'Uzbekistan',
  'TR': 'Turkey',
  'IL': 'Israel',
  'PS': 'Palestine',
  'JO': 'Jordan',
  'LB': 'Lebanon',
  'SY': 'Syria',
  'IQ': 'Iraq',
  'IR': 'Iran',
  'SA': 'Saudi Arabia',
  'AE': 'United Arab Emirates',
  'QA': 'Qatar',
  'KW': 'Kuwait',
  'BH': 'Bahrain',
  'OM': 'Oman',
  'YE': 'Yemen',
  'AF': 'Afghanistan',
  'PK': 'Pakistan',
  'BD': 'Bangladesh',
  'LK': 'Sri Lanka',
  'MV': 'Maldives',
  'NP': 'Nepal',
  'BT': 'Bhutan',
  'MM': 'Myanmar',
  'LA': 'Laos',
  'KH': 'Cambodia',
  'MN': 'Mongolia',
  'TW': 'Taiwan',
  'HK': 'Hong Kong',
  'MO': 'Macau',
  'NZ': 'New Zealand',
  'FJ': 'Fiji',
  'PG': 'Papua New Guinea',
  'SB': 'Solomon Islands',
  'VU': 'Vanuatu',
  'NC': 'New Caledonia',
  'PF': 'French Polynesia',
  'WS': 'Samoa',
  'TO': 'Tonga',
  'CK': 'Cook Islands',
  'NU': 'Niue',
  'PW': 'Palau',
  'FM': 'Federated States of Micronesia',
  'MH': 'Marshall Islands',
  'KI': 'Kiribati',
  'NR': 'Nauru',
  'TV': 'Tuvalu',
}

// Convert vanity numbers (letters) to digits
function convertVanityNumber(phone: string): string {
  const letterMap: Record<string, string> = {
    'A': '2', 'B': '2', 'C': '2',
    'D': '3', 'E': '3', 'F': '3',
    'G': '4', 'H': '4', 'I': '4',
    'J': '5', 'K': '5', 'L': '5',
    'M': '6', 'N': '6', 'O': '6',
    'P': '7', 'Q': '7', 'R': '7', 'S': '7',
    'T': '8', 'U': '8', 'V': '8',
    'W': '9', 'X': '9', 'Y': '9', 'Z': '9'
  }

  return phone.toUpperCase().replace(/[A-Z]/g, letter => letterMap[letter] || letter)
}

// Clean phone number string
function cleanPhoneNumber(phone: string): string {
  // Convert vanity numbers first
  let cleaned = convertVanityNumber(phone)

  // Remove common separators and formatting
  cleaned = cleaned.replace(/[\s\-\(\)\.]/g, '')

  // Remove extensions (x123, ext123, etc.)
  cleaned = cleaned.replace(/\s*(x|ext|extension)\s*\d+$/i, '')

  return cleaned
}

// Calculate phone score based on validation results
function calculatePhoneScore(phoneNumber: PhoneNumber | undefined, isValid: boolean): number {
  if (!isValid || !phoneNumber) {
    return 0.0
  }

  const type = phoneNumber.getType()

  // Score based on phone type
  switch (type) {
    case 'MOBILE':
      return 0.95 // Highest confidence - mobile numbers are most useful for verification
    case 'FIXED_LINE':
      return 0.85 // High confidence - landlines are legitimate
    case 'FIXED_LINE_OR_MOBILE':
      return 0.80 // Good confidence - could be either
    case 'TOLL_FREE':
      return 0.70 // Medium confidence - business numbers
    case 'PREMIUM_RATE':
      return 0.60 // Lower confidence - could be expensive
    case 'VOIP':
      return 0.75 // Good confidence - VoIP numbers are common
    case 'PERSONAL_NUMBER':
      return 0.80 // Good confidence
    case 'PAGER' as any:
      return 0.50 // Lower confidence - outdated technology
    case 'UAN':
      return 0.70 // Medium confidence - universal access numbers
    case 'EMERGENCY' as any:
      return 0.30 // Low confidence - emergency numbers shouldn't be validated
    case 'VOICEMAIL' as any:
      return 0.60 // Lower confidence
    case 'SHORT_CODE' as any:
      return 0.40 // Lower confidence - SMS short codes
    case 'STANDARD_RATE' as any:
      return 0.85 // High confidence - standard rate numbers
    default:
      return 0.70 // Default medium confidence if type is unknown
  }
}

// Get display name for phone type
function getPhoneTypeDisplay(type: string | undefined): string {
  if (!type) return 'unknown'

  switch (type) {
    case 'MOBILE':
      return 'mobile'
    case 'FIXED_LINE':
      return 'landline'
    case 'FIXED_LINE_OR_MOBILE':
      return 'mobile or landline'
    case 'TOLL_FREE':
      return 'toll-free'
    case 'PREMIUM_RATE':
      return 'premium'
    case 'VOIP':
      return 'voip'
    case 'PERSONAL_NUMBER':
      return 'personal'
    case 'PAGER' as any:
      return 'pager'
    case 'UAN':
      return 'universal access'
    case 'EMERGENCY' as any:
      return 'emergency'
    case 'VOICEMAIL' as any:
      return 'voicemail'
    case 'SHORT_CODE' as any:
      return 'short code'
    case 'STANDARD_RATE' as any:
      return 'standard'
    default:
      return type.toLowerCase().replace(/_/g, ' ')
  }
}

// Main phone validation function
export function validatePhone(
  phone: string,
  defaultCountry: string = 'US'
): PhoneResult {
  // Initialize result
  const result: PhoneResult = {
    phone: phone,
    valid: false,
    score: 0,
    formatted: {
      international: '',
      national: '',
      e164: '',
    },
    country: '',
    country_name: '',
    type: null,
    carrier: null, // Note: Carrier detection requires external API
  }

  try {
    // Clean and preprocess phone number
    const cleanedPhone = cleanPhoneNumber(phone)

    // Parse phone number
    const phoneNumber = parsePhoneNumberFromString(cleanedPhone, defaultCountry as CountryCode)

    if (!phoneNumber) {
      result.valid = false
      result.score = 0
      return result
    }

    // Check if the number is valid
    const isValid = phoneNumber.isValid()

    if (isValid) {
      result.valid = true
      result.phone = phoneNumber.format('E.164')

      // Format the phone number in different formats
      result.formatted = {
        international: phoneNumber.formatInternational(),
        national: phoneNumber.formatNational(),
        e164: phoneNumber.format('E.164'),
      }

      // Get country information
      const country = phoneNumber.country
      if (country) {
        result.country = country
        result.country_name = COUNTRY_NAMES[country] || country
      }

      // Get phone type
      const type = phoneNumber.getType()
      result.type = getPhoneTypeDisplay(type)

      // Calculate score
      result.score = calculatePhoneScore(phoneNumber, isValid)
    } else {
      result.valid = false
      result.score = 0
    }

  } catch (error) {
    // Handle parsing errors
    result.valid = false
    result.score = 0
  }

  return result
}