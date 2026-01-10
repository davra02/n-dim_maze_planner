(define (problem maze-2d-prototype)
  (:domain temporal-maze)
  (:objects
    c00 c01 c02 c03
    c10 c11 c12 c13
    c20 c21 c22 c23
    c30 c31 c32 c33 - cell
    b1 b2 b3 b4 - button
    d1 d2 d3 d4 d5 d6 - door

    a1 - agent
  )

  (:init
    (agent-at a1 c00)
    (agent-free a1)

    ;; Open corridors (undirected edges) - maze-like, not a full grid
    (adjacent c00 c01) (adjacent c01 c00)
    (adjacent c01 c11) (adjacent c11 c01)
    (adjacent c11 c12) (adjacent c12 c11)
    (adjacent c12 c02) (adjacent c02 c12)

    (adjacent c10 c00) (adjacent c00 c10)
    (adjacent c10 c11) (adjacent c11 c10)
    (adjacent c20 c21) (adjacent c21 c20)

    (adjacent c13 c23) (adjacent c23 c13)

    ;; Door edges opened by buttons (closed initially)
    (connects d1 c01 c02)
    (connects d1 c02 c01)
    (connects d2 c10 c20)
    (connects d2 c20 c10)
    (connects d3 c21 c22)
    (connects d3 c22 c21)
    (connects d4 c23 c33)
    (connects d4 c33 c23)

    ;; Door edges controlled by time (closed initially)
    (connects d5 c03 c13)
    (connects d5 c13 c03)
    (connects d6 c02 c03)
    (connects d6 c03 c02)

    ;; Buttons open doors
    (up b1 d1)
    (up b2 d2)
    (up b3 d3)
    (up b4 d4)

    ;; Button locations
    (button-at b1 c01)
    (button-at b2 c11)
    (button-at b3 c21)
    (button-at b4 c12)

    ;; Timed events: doors open/close at fixed times
    (at 3 (door-open d6))
    (at 7 (not (door-open d6)))
    (at 8 (door-open d5))
    (at 12 (not (door-open d5)))

    ;; Total cost starts at 0
    (= (total-cost) 0)
  )

  (:goal (and
    (agent-at a1 c33)
  ))

  (:metric minimize (total-cost))
)
