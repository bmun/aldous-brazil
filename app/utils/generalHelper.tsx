import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { getSupabaseUser, SchoolProps } from "./supabaseHelpers";
import { AccountProps } from "../login/modals/AccountRegistrationModal";

export async function autoRedirect(router: AppRouterInstance) {
    try {
        const user_struct = await getSupabaseUser();
        if (user_struct == null) {
            router.push('/login');
            return;
        }
        router.push(`/${user_struct.user_type}`);
    } catch (error) {
        console.error(error);
        router.push('/login');
    }
}

export async function noLoginRedirect(router: AppRouterInstance) {
    try {
        const user_struct = await getSupabaseUser();
        if (user_struct == null) {
            router.push('/login');
        }
    } catch (error) {
        console.error(error);
        router.push('/login');
    }
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidAccountInfo(accountInfo: AccountProps, confPassword: string) {
    if (!Object.values(accountInfo).every(value => value !== "")) {
        return "Missing account information";
    } else if (!isValidEmail(accountInfo.email)) {
        return "Invalid account email";
    } else if (accountInfo.password.length < 8) {
        return "Invalid Password"
    } else if (accountInfo.password != confPassword) {
        return "Passwords do not match"
    }
    return "";
}

export function isValidSchoolInfo(schoolInfo: SchoolProps): string {
    // Required string fields (excluding optional ones)
    const mandatoryFields: (keyof SchoolProps)[] = [
        "name",
        "address",
        "city",
        "state",
        "zip_code",
        "country",
        "primary_name",
        "primary_email",
        "primary_phone",
        "delegation_type"
    ];

    // Check that required fields are not empty
    for (const field of mandatoryFields) {
        const value = schoolInfo[field];
        if (typeof value === "string" && value.trim() === "") {
            return "Missing school information";
        }
    }

    // Validate primary email
    if (!isValidEmail(schoolInfo.primary_email)) {
        return "Invalid advisor email";
    }

    // Check delegation type is not placeholder
    if (schoolInfo.delegation_type === "Delegation Type") {
        return "Please select a valid delegation type";
    }

    return "";
}

export const defaultConferenceData = {
    session: 0,
    start_date: "",
    end_date: "",
    reg_open: "",
    round_one_end: "",
    round_one_fees_due: "",
    round_two_end: "",
    round_two_fees_due: "",
    round_three_end: "",
    round_three_fees_due: "",
    round_four_fees_due: "",
    part_refund_deadline: "",
    reg_close: "",
    min_attendance: 0,
    max_attendance: 0,
    advisor_edit_deadline: "",
    early_paper_deadline: "",
    paper_deadline: "",
    waiver_avail_date: "",
    waiver_deadline: "",
    external: "",
    treasurer: "",
    reg_fee: 0,
    del_fee: 0,
    open_reg: false,
    waitlist_reg: false,
    position_papers_accepted: false,
    waiver_link: "N/A",
    current_conference: false
};

export const COMMITTEE_LIST: string[] = [
  "ECOFIN",
  "WHO",
  "FAO",
  "UNOOSA",
  "DISEC"
];

export const SINGLE_COMMITTEE: string[] = [

];

export const WAIVER_URL = "https://waiver.smartwaiver.com/w/xzv2c18nnojoufyp4gssaz/web/";

export const UN_COUNTRIES: string[] = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas",
  "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin",
  "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei",
  "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon",
  "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia",
  "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba",
  "Cyprus", "Czech Republic", "Democratic Republic of the Congo", "Denmark",
  "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador",
  "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji",
  "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece",
  "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti",
  "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq",
  "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan",
  "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon",
  "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands",
  "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco",
  "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru",
  "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria",
  "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau",
  "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines",
  "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis",
  "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino",
  "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles",
  "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan",
  "Suriname", "Sweden", "Switzerland", "Syria", "Tajikistan", "Tanzania",
  "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia",
  "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu",
  "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];
