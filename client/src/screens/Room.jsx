import React, { useCallback, useEffect, useState } from 'react'
import ReactPlayer from 'react-player'
import { useSocket } from '../context/SocketProvider'
import peer from '../Service/peer'

const Room = () => {


    const socket=useSocket()
    const [remoteSocketId,setRemoteSocketId]=useState(null)
    const [mystream,setmystream]=useState(null);
    const [remoteStream, setRemoteStream] = useState();

    const handleUserJoined=useCallback(({email,id})=>{
        console.log(`Email ${email} joined room`)
        setRemoteSocketId(id);
    },[]);


    const handleCallUser=useCallback(async ()=>{
         const stream=await navigator.mediaDevices.getUserMedia({
            audio:true,
            video:true
         })
         const offer=await peer.getoffer();
         socket.emit("user:call",{to:remoteSocketId,offer})
         setmystream(stream)
    },[remoteSocketId,socket]);
    

    const handleIncomingCall= useCallback(async({from,offer})=>{
      setRemoteSocketId(from);
      const stream=await navigator.mediaDevices.getUserMedia({
        audio:true,
        video:true
     })
     setmystream(stream)
      console.log('incoming call',from,offer);
      const ans= await peer.getAnswer(offer);
      socket.emit('call:accepted',{to: from ,ans})
    },[socket]);


    const sendStreams = useCallback(() => {
      for (const track of mystream.getTracks()) {
        peer.peer.addTrack(track, mystream);
      }
    }, [mystream]);


    const handleCallAccepted=useCallback(async ({from,ans})=>{
      peer.setLocalDescription(ans);
      console.log("call accepted");
      sendStreams();
    },[sendStreams]);

    const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getoffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

     useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

   const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

    
    useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);

    useEffect(()=>{
        socket.on('user:joined',handleUserJoined);
        socket.on('incoming:call',handleIncomingCall)
        socket.on('call:accepted',handleCallAccepted)
        socket.on("peer:nego:needed", handleNegoNeedIncomming);
        socket.on("peer:nego:final", handleNegoNeedFinal);
        return ()=>{
          socket.off('user:joined',handleUserJoined)
          socket.off('incoming:call',handleIncomingCall)
          socket.off('call:accepted',handleCallAccepted)
          socket.off("peer:nego:needed", handleNegoNeedIncomming);
          socket.off("peer:nego:final", handleNegoNeedFinal);
        }
    },[socket,handleUserJoined,handleIncomingCall,handleCallAccepted,handleNegoNeedIncomming,handleNegoNeedFinal]);


  return ( 
    <div>
      <h1>Romm Page</h1>
      <h4>{remoteSocketId?'connectded':"no one in room"}</h4>
      {mystream && <button onClick={sendStreams}>Send Stream</button>}
      {remoteSocketId&&<button onClick={handleCallUser}>CALL</button>}
      {
        mystream&&
        <>
        <h1>My Stream</h1>
        <ReactPlayer playing muted height="100px" width='300px' url={mystream}/>
        </>
      }
      {remoteStream && (
        <>
          <h1>Remote Stream</h1>
          <ReactPlayer
            playing
            muted
            height="100px"
            width="200px"
            url={remoteStream}
          />
        </>
      )}
    </div>
  )
}

export default Room
