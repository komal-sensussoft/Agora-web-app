var config = {
    mode: 'rtc',
    codec: 'vp8'
}

var client = AgoraRTC.createClient(config);
var options = {
    appId: null,
    channel: null,
    token: null,
    uid: null,
}
var localTracks = {
    audioTrack: null,
    videoTrack: null,
};

var remoteUsers = {};
$('#Leave').attr('disabled', true);


$('#Join').click(async function(e) {

    try {
        options.appId = $('#appId').val();
        options.channel = $('#channel').val();
        options.token = $('#token').val();
        await join();
    } catch (error) {
        console.error(error);
    } finally {
        $('#Leave').attr('disabled', false);
        $('#Join').attr('disabled', true);
    }
});

// async function join() {
//     client.on('user-published', handleUserPublished);
//     client.on('user-unpublished', handleUserUnPublished);


//     [options.uid, localTracks.audioTrack, localTracks.videoTrack] = await Promise.all([

//         client.join(options.appId, options.channel, options.token || null),
//         AgoraRTC.createMicrophoneAudioTrack(),
//         AgoraRTC.createCameraVideoTrack(),

//     ]);

//     localTracks.videoTrack.play('local-user');
//     $('#local-user-stream').text(`local-user-(${options.uid})`);
//     await client.publish(Object.values(localTracks));

//     console.log('Publish successfully');
//     showUIButtons();

// }
var localClient;
var screenSharingClient;

async function join() {
    try {
        options.appId = $('#appId').val();
        options.channel = $('#channel').val();
        options.token = $('#token').val();

        client.on('user-published', handleUserPublished);
        client.on('user-unpublished', handleUserUnPublished);

        [options.uid, localTracks.audioTrack, localTracks.videoTrack] = await Promise.all([
            client.join(options.appId, options.channel, options.token || null),
            AgoraRTC.createMicrophoneAudioTrack(),
            AgoraRTC.createCameraVideoTrack(),
        ]);

        localTracks.videoTrack.play('local-user');
        $('#local-user-stream').text(`local-user-(${options.uid})`);

        // Initialize local client for screen sharing
        screenSharingClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        screenSharingClient.on('user-published', handleUserPublished);
        screenSharingClient.on('user-unpublished', handleUserUnPublished);

        // Initialize local client for camera video
        localClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

        // Unpublish the camera video track if it was previously published
        if (localTracks.publishedVideoTrack) {
            await localClient.unpublish([localTracks.publishedVideoTrack]);
        }

        // Check if screen track exists and screen sharing is active
        if (localTracks.screenTrack && isScreenSharing) {
            // Publish the screen-sharing track using the screenSharingClient
            await screenSharingClient.join(options.appId, options.channel, options.token || null);
            await screenSharingClient.publish([localTracks.screenTrack]);
            localTracks.publishedVideoTrack = localTracks.screenTrack;
        } else {
            // If screen track doesn't exist or screen sharing is not active, publish the camera video track using the localClient
            await localClient.join(options.appId, options.channel, options.token || null);
            await localClient.publish([localTracks.videoTrack]);
            localTracks.publishedVideoTrack = localTracks.videoTrack;
        }

        console.log('Publish successfully');
        showUIButtons();
    } catch (error) {
        console.error(error);
    } finally {
        $('#Leave').attr('disabled', false);
        $('#Join').attr('disabled', true);
    }
}

// Add a function to leave the channel for each client
function leaveChannel(client) {
    return new Promise(async (resolve) => {
        if (client) {
            for (trackName in localTracks) {
                var track = localTracks[trackName];
                if (track) {
                    track.stop();
                    track.close();
                    localTracks[trackName] = undefined;
                }
            }

            await client.leave();
            resolve();
        }
    });
}

$('#Leave').click(async function (e) {
    await leaveChannel(localClient);
    await leaveChannel(screenSharingClient);
    $('#remote-user').html('');
    $('#Leave').attr('disabled', true);
    $('#Join').attr('disabled', false);
    $('#local-user-stream').text('');
    console.log('Leave Successfully');
    hideUIButtons();
});



// Add a function to leave the channel for each client
function leaveChannel(client) {
    return new Promise(async (resolve) => {
        if (client) {
            for (trackName in localTracks) {
                var track = localTracks[trackName];
                if (track) {
                    track.stop();
                    track.close();
                    localTracks[trackName] = undefined;
                }
            }

            await client.leave();
            resolve();
        }
    });
}

$('#Leave').click(async function (e) {
    await leaveChannel(localClient);
    await leaveChannel(screenSharingClient);
    $('#remote-user').html('');
    $('#Leave').attr('disabled', true);
    $('#Join').attr('disabled', false);
    $('#local-user-stream').text('');
    console.log('Leave Successfully');
    hideUIButtons();
});



async function subscribe(user, mediaType) {
    const id = user.uid;
    await client.subscribe(user, mediaType);
    console.log('Subscribed successfully');
    if (mediaType === 'video') {
        const player = $(`
       <id="player-wrapper-${id}">
       <p class="player-name">remote-player-(${id})</p>
       <div id="player-${id}" class="player"></div>
       </div> 
       `);

        $('#remote-user').append(player);
        user.videoTrack.play(`player-${id}`);
    }
    if (mediaType === 'audio') {
        user.audioTrack.play();
    }

}


$('#Leave').click(function(e) {
    leave();
});

async function leave() {
    for (trackName in localTracks) {
        var track = localTracks[trackName];
        if (track) {
            track.stop();
            track.close();
            localTracks[trackName] = undefined;
        }

    }

    remoteUsers = {};
    await client.leave();
    $('#remote-user').html('');
    $('#Leave').attr('disabled', true);
    $('#Join').attr('disabled', false);
    $('#local-user-stream').text('');
    console.log('Leave Successfully');
    hideUIButtons();

}


function handleUserPublished(user, mediaType) {
    const id = user.uid;
    remoteUsers[id] = user;
    subscribe(user, mediaType);
}

function handleUserUnPublished(user) {
    const id = user.uid;
    delete remoteUsers[id];
    $(`player-wrapper-${id}`).remove();
}










// Add a global variable to track the screen sharing state
var isScreenSharing = false;

// Add an event listener for the screen sharing button
$('#ShareScreen').click(async function (e) {
    try {
        if (!isScreenSharing) {
            // Start screen sharing
            const screenTrack = await AgoraRTC.createScreenVideoTrack();
            localTracks.screenTrack = screenTrack;

            // Publish the screen sharing track
            await client.publish([screenTrack]);
            console.log('Screen sharing started');

            // Update UI
            isScreenSharing = true;
        } else {
            // Stop screen sharing
            const screenTrack = localTracks.screenTrack;
            if (screenTrack) {
                screenTrack.stop();
                screenTrack.close();
                localTracks.screenTrack = undefined;

                // Unpublish the screen sharing track
                await client.unpublish([screenTrack]);
                console.log('Screen sharing stopped');

                // Update UI
                isScreenSharing = false;
            }
        }
    } catch (error) {
        console.error('Error during screen sharing:', error);
    }
});

async function subscribe(user, mediaType) {
    const id = user.uid;
    await client.subscribe(user, mediaType);
    console.log('Subscribed successfully');

    if (mediaType === 'video') {
        const player = $(`
           <div id="player-wrapper-${id}">
               <p class="player-name">remote-player-(${id})</p>
               <div id="player-${id}" class="player"></div>
           </div> 
        `);

        $('#remote-user').append(player);
        user.videoTrack.play(`player-${id}`);
    } else if (mediaType === 'audio') {
        user.audioTrack.play();
    } else if (mediaType === 'screen') {
        console.log("screen");
        // Handle screen sharing subscription
        const screenPlayer = $(`
           <div id="screen-wrapper-${id}">
               <p class="player-name">screen-sharing-(${id})</p>
               <div id="screen-${id}" class="player"></div>
           </div> 
        `);

        $('#remote-user').append(screenPlayer);
        user.screenTrack.play(`screen-${id}`);
    }
}
