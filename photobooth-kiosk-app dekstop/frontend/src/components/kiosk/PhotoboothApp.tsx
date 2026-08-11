"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Clock } from "lucide-react";
import { TimeoutModal } from "./TimeoutModal";
import { SetupStep } from "./SetupStep";
import { WelcomeStep } from "./WelcomeStep";
import { SelectThemeStep } from "./SelectThemeStep";
import { SelectFrameStep } from "./SelectFrameStep";
import { CaptureStep } from "./CaptureStep";
import { SelectPhotosStep } from "./SelectPhotosStep";
import { FilterStep } from "./FilterStep";
import { PrintQuantityStep } from "./PrintQuantityStep";
import { PaymentStep } from "./PaymentStep";
import { ReviewStep } from "./ReviewStep";
import { DoneStep } from "./DoneStep";
import { PrePaymentFormModal } from "./PrePaymentFormModal";
import { AdminPasswordModal } from "./AdminPasswordModal";
import { KioskLockOverlay } from "./KioskLockOverlay";
import { KioskThemeProvider } from "./KioskThemeProvider";
import { cardSurfaceStyle } from "@/lib/kiosk/theme";
import { getScreenBg, kioskStepToScreen } from "@/lib/kiosk/screenBg";
import { usePhotoboothController } from "@/hooks/usePhotoboothController";

export default function PhotoboothApp() {
  const {
    step,
    setStep,
    inputApiKey,
    setInputApiKey,
    apiKey,
    kioskSettings,
    themes,
    selectedTheme,
    setSelectedTheme,
    selectedFrame,
    setSelectedFrame,
    cameraStatus,
    currentShotIndex,
    countdown,
    isFlashActive,
    capturedPhotos,
    isCaptureStarted,
    setIsCaptureStarted,
    statusMessage,
    testPhotoUrl,
    setTestPhotoUrl,
    previewPhoto,
    printers,
    defaultPrinter,
    selectedPrinter,
    printerLoading,
    printerMessage,
    isTestPrinting,
    printerServiceOk,
    selectedPhotos,
    setSelectedPhotos,
    activeSlot,
    setActiveSlot,
    selectedFilter,
    setSelectedFilter,
    isLayoutMirrored,
    setIsLayoutMirrored,
    isProcessingPayment,
    checkoutData,
    paymentError,
    isPrinting,
    showPasswordModal,
    setShowPasswordModal,
    inputPassword,
    setInputPassword,
    passwordError,
    setPasswordError,
    isVerifyingPassword,
    isPassFocused,
    setIsPassFocused,
    hasContinuedSession,
    setHasContinuedSession,
    customerName,
    customerEmail,
    customerPhone,
    printQuantity,
    setPrintQuantity,
    showPrePaymentForm,
    setShowPrePaymentForm,
    activeInputField,
    setActiveInputField,
    isShiftActive,
    setIsShiftActive,
    formValidationError,
    setFormValidationError,
    isUploadingCloud,
    uploadPhase,
    uploadItems,
    uploadError,
    previewUrl,
    printStatus,
    localVideoUrl,
    localLiveUrl,
    stepTimer,
    setStepTimer,
    showToleranceModal,
    setShowToleranceModal,
    showExpiredModal,
    setShowExpiredModal,
    toleranceTimer,
    liveViewKey,
    theme,
    adminUrl,
    cameraUrl,
    loadKioskConfig,
    fetchCameraStatus,
    handleSelectPrinter,
    triggerTestPrint,
    formatTime,
    startCaptureFlow,
    triggerCapture,
    handleStartSession,
    handleVerifyPassword,
    handleVirtualKeyPress,
    handleVirtualBackspace,
    handleVirtualClear,
    handleConfirmPrePaymentForm,
    savePhoto,
    discardPhoto,
    handleSelectThumbnail,
    handleAssignPhotoToSlot,
    handleRetakeAll,
    handleProceedToPayment,
    generateCheckout,
    handleProceedToReview,
    handleProceedToReviewRef,
    handlePrint,
    getShareUrl,
    handleGoHome,
    resolveEffectivePrintQty,
    setPaymentVerified,
  } = usePhotoboothController();

  const activeScreen = kioskStepToScreen(step);
  const screenBg = activeScreen
    ? getScreenBg(
        kioskSettings?.kioskScreenBgImages,
        activeScreen,
        kioskSettings?.kioskBgImageUrl,
        kioskSettings?.kioskBgImageOpacity,
      )
    : { url: null, opacity: 1 };

  return (
    <KioskThemeProvider settings={kioskSettings}>
    <main 
      className={`relative w-full min-h-screen transition-all duration-500 ${
        step === "WELCOME"
          ? "h-screen overflow-hidden"
          : step === "SETUP"
            ? "min-h-screen h-screen overflow-y-auto flex flex-col items-stretch px-3 sm:px-4 py-4 sm:py-6"
            : step === "CAPTURE"
              ? "h-screen overflow-hidden flex flex-col"
              : step === "DONE"
                ? "h-screen overflow-hidden flex items-center justify-center px-2 sm:px-4"
              : "h-screen overflow-hidden flex items-center justify-center"
      }`}
      style={{ 
        background: theme.bgStyle,
        fontFamily: theme.fontFamily,
        color: theme.textColorHex,
      }}
    >
      {screenBg.url && (
        <div 
          className="absolute inset-0 pointer-events-none transition-all duration-500 z-0"
          style={{
            backgroundImage: `url(${screenBg.url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: screenBg.opacity,
          }}
        />
      )}

      {theme.showBgDots && (
        <div 
          className="absolute inset-0 opacity-[0.08] pointer-events-none [background-size:24px_24px] z-0" 
          style={{ 
            backgroundImage: `radial-gradient(${theme.dotColor} 1.5px, transparent 1.5px)` 
          }} 
        />
      )}

      <AnimatePresence>
        {isFlashActive && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {step === "WELCOME" && (
        <div
          className="absolute top-6 left-6 z-40 flex items-center gap-3 px-4 py-2 rounded-2xl border backdrop-blur text-xs"
          style={cardSurfaceStyle(theme)}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.accent }} />
          <span>Kiosk Client: {theme.brandName}</span>
        </div>
      )}

      {stepTimer !== null && stepTimer > 0 && step !== "SETUP" && step !== "WELCOME" && (
        <div 
          className={`absolute top-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-5 py-2.5 rounded-full border backdrop-blur text-xs font-bold transition shadow-lg ${
            stepTimer < 30 
              ? "bg-red-950/80 border-red-500/40 text-red-200 animate-pulse animate-duration-500" 
              : ""
          }`}
          style={stepTimer < 30 ? undefined : cardSurfaceStyle(theme)}
        >
          <Clock 
            className={`w-3.5 h-3.5 ${stepTimer < 30 ? "text-red-400 animate-spin" : ""}`} 
            style={stepTimer < 30 ? { animationDuration: '3s' } : { color: theme.accent }} 
          />
          <span>Sisa Waktu: {formatTime(stepTimer)}</span>
        </div>
      )}

      {step === "WELCOME" && (
        <button 
          onClick={() => {
            if (apiKey) {
              setShowPasswordModal(true);
              setInputPassword("");
              setPasswordError("");
            } else {
              setStep("SETUP");
            }
          }}
          className="absolute top-6 right-6 z-40 p-2 rounded-xl transition border"
          style={{ color: theme.subtextColorHex, borderColor: theme.surfaceBorder }}
          title="Setup Koneksi"
        >
          <Lock className="w-4 h-4" />
        </button>
      )}

      <AnimatePresence mode="wait">
        {step === "SETUP" && (
          <div className="relative z-10 w-full flex justify-center items-start py-2 sm:py-4">
            <SetupStep
            inputApiKey={inputApiKey}
            setInputApiKey={setInputApiKey}
            statusMessage={statusMessage}
            kioskSettings={kioskSettings}
            cameraStatus={cameraStatus}
            cameraLiveUrl={`${cameraUrl}/live-view?k=${liveViewKey}`}
            onReconnectCamera={() => void fetchCameraStatus({ silent: true, forceReconnect: true })}
            testPhotoUrl={testPhotoUrl}
            setTestPhotoUrl={setTestPhotoUrl}
            loadKioskConfig={loadKioskConfig}
            setStep={setStep}
            triggerCapture={triggerCapture}
            printers={printers}
            defaultPrinter={defaultPrinter}
            selectedPrinter={selectedPrinter}
            onSelectPrinter={handleSelectPrinter}
            triggerTestPrint={triggerTestPrint}
            printerLoading={printerLoading}
            isTestPrinting={isTestPrinting}
            printerMessage={printerMessage}
            printerServiceOk={printerServiceOk}
          />
          </div>
        )}

        {step === "WELCOME" && (
          <WelcomeStep
            handleStartSession={handleStartSession}
            isPaymentEnabled={kioskSettings?.isPaymentEnabled === true}
          />
        )}

        {step === "SELECT_THEME" && (
          <SelectThemeStep
            themes={themes}
            setSelectedTheme={setSelectedTheme}
            setSelectedFrame={setSelectedFrame}
            setStep={setStep}
            adminUrl={adminUrl}
            isPaymentEnabled={kioskSettings?.isPaymentEnabled === true}
          />
        )}

        {step === "SELECT_FRAME" && (
          <SelectFrameStep
            selectedTheme={selectedTheme}
            selectedFrame={selectedFrame}
            setSelectedFrame={setSelectedFrame}
            setStep={setStep}
            setIsCaptureStarted={setIsCaptureStarted}
            adminUrl={adminUrl}
            isPaymentEnabled={kioskSettings?.isPaymentEnabled !== false}
          />
        )}

        {step === "CAPTURE" && (
          <div className="relative z-10 w-full h-full min-h-0 flex flex-col">
          <CaptureStep
            isCaptureStarted={isCaptureStarted}
            currentShotIndex={currentShotIndex}
            countdown={countdown}
            statusMessage={statusMessage}
            capturedPhotos={capturedPhotos}
            kioskSettings={kioskSettings}
            handleRetakeAll={handleRetakeAll}
            previewPhoto={previewPhoto}
            startCaptureFlow={startCaptureFlow}
            savePhoto={savePhoto}
            discardPhoto={discardPhoto}
            setStep={setStep}
            setActiveSlot={setActiveSlot}
            handleSelectThumbnail={handleSelectThumbnail}
          />
          </div>
        )}

        {step === "SELECT_PHOTOS" && (
          <SelectPhotosStep
            selectedFrame={selectedFrame}
            selectedPhotos={selectedPhotos}
            activeSlot={activeSlot}
            setActiveSlot={setActiveSlot}
            capturedPhotos={capturedPhotos}
            handleAssignPhotoToSlot={handleAssignPhotoToSlot}
            handleRetakeAll={handleRetakeAll}
            setStep={setStep}
            adminUrl={adminUrl}
            isLayoutMirrored={isLayoutMirrored}
            setIsLayoutMirrored={setIsLayoutMirrored}
            setSelectedPhotos={setSelectedPhotos}
          />
        )}

        {step === "FILTER" && (
          <FilterStep
            selectedFrame={selectedFrame}
            selectedPhotos={selectedPhotos}
            selectedFilter={selectedFilter}
            setSelectedFilter={setSelectedFilter}
            handleProceedToPayment={handleProceedToPayment}
            setStep={setStep}
            adminUrl={adminUrl}
            isLayoutMirrored={isLayoutMirrored}
            enabledFilters={kioskSettings?.enabledFilters}
          />
        )}

        {step === "PRINT_QUANTITY" && (
          <PrintQuantityStep
            selectedFrame={selectedFrame}
            selectedPhotos={selectedPhotos}
            selectedFilter={selectedFilter}
            printQuantity={printQuantity}
            setPrintQuantity={setPrintQuantity}
            onConfirm={handleProceedToReview}
            setStep={setStep}
            adminUrl={adminUrl}
            isLayoutMirrored={isLayoutMirrored}
          />
        )}

        {step === "PAYMENT" && (
          <div className="absolute inset-0 z-20 flex flex-col">
            <PaymentStep
              selectedFrame={selectedFrame}
              selectedTheme={selectedTheme}
              isProcessingPayment={isProcessingPayment}
              checkoutData={checkoutData}
              paymentError={paymentError}
              onRetryPayment={generateCheckout}
              setPaymentVerified={setPaymentVerified}
              onPaymentComplete={() => {
                void handleProceedToReviewRef.current();
              }}
              printQuantity={printQuantity}
              apiKey={apiKey}
            />
          </div>
        )}

        {step === "REVIEW" && (
          <ReviewStep
            selectedFrame={selectedFrame}
            selectedPhotos={selectedPhotos}
            selectedFilter={selectedFilter}
            isUploadingCloud={isUploadingCloud}
            isPrinting={isPrinting}
            statusMessage={statusMessage}
            getShareUrl={getShareUrl}
            handleGoHome={handleGoHome}
            handlePrint={handlePrint}
            adminUrl={adminUrl}
            localVideoUrl={localVideoUrl}
            localLiveUrl={localLiveUrl}
            isPaymentEnabled={kioskSettings?.isPaymentEnabled !== false}
          />
        )}

        {step === "DONE" && (
          <DoneStep
            uploadPhase={uploadPhase}
            uploadItems={uploadItems}
            uploadError={uploadError}
            previewUrl={previewUrl}
            localVideoUrl={localVideoUrl}
            localLiveUrl={localLiveUrl}
            selectedFrame={selectedFrame}
            selectedPhotos={selectedPhotos}
            selectedFilter={selectedFilter}
            adminUrl={adminUrl}
            printStatus={printStatus}
            printQuantity={printQuantity}
            getShareUrl={getShareUrl}
            handleGoHome={handleGoHome}
            onRetryPrint={() => {
              const remaining = resolveEffectivePrintQty(printQuantity);
              if (remaining > 0) void handlePrint(remaining);
            }}
          />
        )}
      </AnimatePresence>

      <PrePaymentFormModal
        open={showPrePaymentForm}
        theme={theme}
        customerName={customerName}
        customerEmail={customerEmail}
        customerPhone={customerPhone}
        printQuantity={printQuantity}
        formValidationError={formValidationError}
        activeInputField={activeInputField}
        isShiftActive={isShiftActive}
        selectedTheme={selectedTheme}
        selectedFrame={selectedFrame}
        onClose={() => setShowPrePaymentForm(false)}
        onConfirm={handleConfirmPrePaymentForm}
        onFocusField={(field) => {
          setActiveInputField(field);
          setFormValidationError("");
        }}
        onSetPrintQuantity={setPrintQuantity}
        onKeyPress={handleVirtualKeyPress}
        onBackspace={handleVirtualBackspace}
        onClear={handleVirtualClear}
        onToggleShift={() => setIsShiftActive(!isShiftActive)}
      />

      <AdminPasswordModal
        open={showPasswordModal}
        theme={theme}
        inputPassword={inputPassword}
        passwordError={passwordError}
        isVerifyingPassword={isVerifyingPassword}
        isPassFocused={isPassFocused}
        onClose={() => setShowPasswordModal(false)}
        onVerify={handleVerifyPassword}
        onPasswordChange={setInputPassword}
        onPassFocus={() => setIsPassFocused(true)}
        onPassBlur={() => setIsPassFocused(false)}
      />

      <TimeoutModal
        showTolerance={showToleranceModal}
        showExpired={showExpiredModal}
        toleranceTime={toleranceTimer}
        onContinue={() => {
          setStepTimer(90);
          setHasContinuedSession(true);
          setShowToleranceModal(false);
        }}
        onReturn={() => {
          handleGoHome();
          setShowToleranceModal(false);
        }}
      />

      <KioskLockOverlay locked={!!kioskSettings?.isKioskLocked} theme={theme} />

    </main>
    </KioskThemeProvider>
  );
}
