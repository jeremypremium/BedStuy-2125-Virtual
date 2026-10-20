-- Swap the 1111 Myrtle pilot from the Street View capture to an original photo.
-- Run this only after the client has deployed client/images/sites/1111-myrtle-v2.*

UPDATE sites
SET photo_url = 'https://bedstuy-2125-virtual-client.onrender.com/images/sites/1111-myrtle-v2.jpg',
    mask_url  = 'https://bedstuy-2125-virtual-client.onrender.com/images/sites/1111-myrtle-v2-mask.png',
    context   = 'Street-level view from Myrtle Avenue, under the elevated train. A green-painted, riveted steel el girder runs across the top of the frame, held up by steel columns at the left and right edges. Below it, a vacant lot behind a long dark plywood construction fence covered in graffiti, with a row of orange and white plastic traffic barriers along the street in front of it; the fence and barriers are temporary construction and can be replaced. Behind the lot: an older brick apartment building with fire escapes and a large graffiti tag on its roofline, a tan brick building with red bands, and a new white mid-rise apartment building with balconies. Clear blue sky, bright late-afternoon sun with long shadows.'
WHERE slug = '1111-myrtle';
