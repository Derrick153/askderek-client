export type Highlight = "HighSpeedInternetAccess" | "WasherDryer" | "AirConditioning" | "Heating" | "SmokeFree" | "CableReady" | "SatelliteTV" | "DoubleVanities" | "TubShower" | "Intercom" | "SprinklerSystem" | "RecentlyRenovated" | "CloseToTransit" | "GreatView" | "QuietNeighborhood" | "SecurityGuard" | "Gated" | "BackupGenerator" | "BoreHole";

export type Amenity = "WasherDryer" | "AirConditioning" | "Dishwasher" | "HighSpeedInternet" | "HardwoodFloors" | "WalkInClosets" | "Microwave" | "Refrigerator" | "Pool" | "Gym" | "Parking" | "PetsAllowed" | "WiFi" | "Generator" | "WaterTank" | "DSTV" | "TiledFloors" | "Balcony" | "Furnished" | "SemiFinished";

export type PropertyType = "Rooms" | "SelfContained" | "Chamber" | "Apartment" | "Villa" | "Townhouse" | "Cottage" | "Tinyhouse" | "Office" | "Shop" | "CompoundHouse";

export type ApplicationStatus = "Pending" | "Approved" | "Denied";

export type PaymentStatus = "Pending" | "Paid" | "PartiallyPaid" | "Overdue";

export interface Location { id: number; address: string; city: string; state: string; region?: string; country: string; postalCode: string; coordinates?: any; }

export interface Manager { id: number; clerkId: string; name: string; email: string; phoneNumber: string; managedProperties?: Property[]; }

export interface Tenant { id: number; clerkId: string; name: string; email: string; phoneNumber: string; properties?: Property[]; favorites?: Property[]; applications?: Application[]; leases?: Lease[]; }

export interface Property { id: number; name: string; description: string; pricePerMonth: number; securityDeposit: number; applicationFee: number; photoUrls: string[]; amenities: Amenity[]; highlights: Highlight[]; isPetsAllowed: boolean; isParkingIncluded: boolean; beds: number; baths: number; squareFeet: number; propertyType: PropertyType; postedDate: string; averageRating?: number; numberOfReviews?: number; locationId: number; managerClerkId: string; location: Location; manager: Manager; leases?: Lease[]; applications?: Application[]; favoritedBy?: Tenant[]; tenants?: Tenant[]; listingType?: string; listingStatus?: string; askingPrice?: number; }

export interface Application { id: number; applicationDate: string; status: ApplicationStatus; propertyId: number; tenantClerkId: string; name: string; email: string; phoneNumber: string; message?: string; leaseId?: number; property: Property; tenant: Tenant; lease?: Lease; }

export interface Lease { id: number; startDate: string; endDate: string; rent: number; deposit: number; propertyId: number; tenantClerkId: string; property?: Property; tenant?: Tenant; application?: Application; payments?: Payment[]; nextPaymentDate?: string; }

export interface Payment { id: number; amountDue: number; amountPaid: number; dueDate: string; paymentDate?: string | null; paymentStatus: PaymentStatus; leaseId: number; paystackReference?: string; lease?: Lease; }

