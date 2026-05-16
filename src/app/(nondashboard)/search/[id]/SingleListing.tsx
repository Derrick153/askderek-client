"use client";
import { useGetAuthUserQuery, useGetPropertyQuery } from "@/state/api";
import { useParams } from "next/navigation";
import React, { useState } from "react";
import ImagePreviews from "./ImagePreviews";
import PropertyOverview from "./PropertyOverview";
import PropertyDetails from "./PropertyDetails";
import PropertyLocation from "./PropertyLocation";
import ContactWidget from "./ContactWidget";
import ApplicationModal from "./ApplicationModal";
import ApplyButton from "@/components/ApplyButton";

const SingleListing = () => {
  const { id } = useParams();
  const propertyId = Number(id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: authUser } = useGetAuthUserQuery();
  const { data: property, isLoading } = useGetPropertyQuery(propertyId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading property...</p>
        </div>
      </div>
    );
  }

  const photos = property?.photoUrls?.length
    ? property.photoUrls
    : ["/placeholder-property.jpg"];

  return (
    <div className="min-h-screen bg-white">
      <ImagePreviews images={photos} />
      <div className="flex flex-col md:flex-row justify-center gap-10 mx-4 md:w-2/3 md:mx-auto mt-10 mb-16">
        <div className="order-2 md:order-1 flex-1">
          <PropertyOverview propertyId={propertyId} />
          <PropertyDetails propertyId={propertyId} />
          <PropertyLocation propertyId={propertyId} />
        </div>
        <div className="order-1 md:order-2 md:w-96">
          <ContactWidget 
  onOpenModal={() => setIsModalOpen(true)} 
  propertyId={propertyId}
/>
          {property && (
            <div className="mt-6 sticky top-24">
              <ApplyButton property={property} />
            </div>
          )}
        </div>
      </div>
      {authUser && (
        <ApplicationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          propertyId={propertyId}
        />
      )}
    </div>
  );
};

export default SingleListing;