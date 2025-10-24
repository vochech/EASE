'use client'
import { useEffect, useRef, useState } from 'react'

type Props = {
  kind: 'audio' | 'video'
  onBlobReady: (blob: Blob) => Promise<void> | void
}

export default function Recorder({ kind, onBlobReady }: Props) {
  const mediaRef = useRef<HTMLVideoElement | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const [recording, setRecording] = useState(false)

  useEffect(() => () => stop(), []) // cleanup on unmount

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia(
      kind === 'audio' ? { audio: true } : { audio: true, video: true }
    )
    if (mediaRef.current && kind === 'video') {
      mediaRef.current.srcObject = stream
      mediaRef.current.muted = true
      await mediaRef.current.play()
    }
    chunksRef.current = []
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' })
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data)
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      await onBlobReady(blob)
      stream.getTracks().forEach(t => t.stop())
      if (mediaRef.current) { mediaRef.current.srcObject = null }
    }
    rec.start()
    recRef.current = rec
    setRecording(true)
  }

  function stop() {
    if (!recRef.current) return
    recRef.current.stop()
    setRecording(false)
  }

  return (
    <div className="space-y-2">
      {kind === 'video' && (
        <video ref={mediaRef} className="w-full rounded-lg border" />
      )}
      <div className="flex gap-2">
        {!recording
          ? <button className="ease-outline-btn" onClick={start}>Start</button>
          : <button className="ease-outline-btn" onClick={stop}>Stop</button>}
      </div>
    </div>
  )
}
