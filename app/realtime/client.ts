let pc: RTCPeerConnection
let dc: RTCDataChannel

export async function initRealTime() {
    pc = new RTCPeerConnection()
    
    // audio output
    const audioEl = document.createElement("audio")
    audioEl.autoplay = true
    
    pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0]
    }

    // data channel (events)
    dc = pc.createDataChannel("oai-events")

    dc.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log("EVENT: ", data)
    }

    // get mic
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    
    stream.getTracks().forEach(track => {
        pc.addTrack(track, stream)
    })

    // create offer
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
    })
    await pc.setLocalDescription(offer)

    // send to OpenAI
    const res = await fetch("/api/realtime", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ sdp: offer.sdp }),
    });

    const data = await res.json()

    if (!data?.sdp) {
        console.error("Invalid SDP response", data);
        throw new Error("No SDP returned from server");
    }

    await pc.setRemoteDescription(
      new RTCSessionDescription({
        type: "answer",
        sdp: data.sdp,
      })
    )
}