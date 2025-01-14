"use client"
import { JitsiMeeting } from "@jitsi/react-sdk";

interface JitsiProps {
  roomName: string;
  username: string;
  email: string;
}

const JitsiComponent = ({ roomName, username, email }: JitsiProps) => {
  return (
    <div>
      <h1>Join the Meeting</h1>
      <JitsiMeeting
        domain="meet.jit.si"
        roomName={roomName}
        configOverwrite={{
          startWithAudioMuted: true,
          disableModeratorIndicator: true,
          startScreenSharing: true,
          enableEmailInStats: false,
        }}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        }}
        userInfo={{
          displayName: username,
          email: email, // Include the email here
        }}
        onApiReady={(externalApi) => {
          console.log("Jitsi External API Ready");
          externalApi.addEventListener("readyToClose", () => {
            console.log("Meeting closed by the user");
          });
        }}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.height = "700px";
        }}
      />
    </div>
  );
};

export default JitsiComponent;
