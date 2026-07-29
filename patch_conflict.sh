#!/bin/bash
# Accept "Updated upstream" for HomeTabComponents.kt
sed -i '' -e '/<<<<<<< Updated upstream/d' -e '/=======/,/>>>>>>> Stashed changes/d' app/src/main/java/com/example/swastik/ui/screens/patient/components/HomeTabComponents.kt
