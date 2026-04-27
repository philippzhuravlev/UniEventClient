// "types" = data type "molds" that DB items are cast into
// "export" = make the type available to other files
// "slug" = short, stable, human-readable identifier in the URL

// N.B.: We're only using Facebook-only domain types

export interface Page { // A FB Page we pull events from
    id: string;         // FB Page ID or just a slug
    name: string;
    url: string;        // Facebook Page URL
    active: boolean;
}

export interface Location {
    street?: string;
    city?: string;
    zip?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
}

export interface Event {
    id: string;                  // event id
    pageId: string;              // Page id (source)
    title: string;               // FB: "name"
    description?: string;        // FB: "description"
    startTime: string;           // ISO format; FB: "start_time"
    endTime?: string;            // ISO; FB: "end_time"
    place?: Place;               // Place (where the event is held)
    coverImageUrl?: string;      // FB: event_cover.source or cover.source
    eventURL?: string;           // e.g. https://facebook.com/events/{id}
    createdAt: string;           // ISO format (when we stored it)
    updatedAt: string;           // ISO (last sync/update)
}

export interface Place {
    id?: string;      // FB Place ID
    name?: string;    // e.g. "S-Huset, DTU Lyngby"
    location?: Location;
}

// Event Page Component Props
export interface EventHeaderProps {
    onBack: () => void;
}

export interface EventImageProps {
    coverImageUrl: string | undefined;
    title: string;
}

export interface EventDetailsProps {
    event: Event;
}

export interface EventDescriptionProps {
    description: string | undefined;
}

/**
 * Response from verifying an organizer key
 * Received from: POST /api/auth/organizer-key/verify
 */
export type OrganizerKeyVerifyResponse = {
  confirmationToken: string;  // JWT token, valid for 10 minutes
  expiresIn: number;          // Expiration time in seconds (e.g., 600)
  email: string;              // Email associated with this key
};

/**
 * Request body for completing organizer registration with key
 * Sent to: POST /api/auth/register-with-key
 */
export type OrganizerRegisterWithKeyRequest = {
  confirmationToken: string;  // JWT token from Step 1
  username: string;           // 3-50 chars
  password: string;           // 12-100 chars minimum
  email: string;              // Must match email from key verification
};

/**
 * Request body for organizer key application
 * Sent to: POST /api/auth/organizer-key-request
 */
export type OrganizerKeyRequestData = {
    fullName: string;
    email: string;
    phone: string;
    organization: string;
    organizationFacebookPage: string;
    personalFacebookProfile: string;
    proofOfEligibility: string;
    comment?: string;
};

/**
 * Response after submitting organizer key request
 */
export type OrganizerKeyRequestResponse = {
    message: string;
};
